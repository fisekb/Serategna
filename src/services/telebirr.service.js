const crypto = require('crypto');
const {
  Booking,
  PaymentSubmission,
  SmsLog,
  TelebirrPayment,
  sequelize
} = require('../models');
const AppError = require('../utils/AppError');

const smsPattern = /^Dear [^.()]{0,80}? You have received ETB ([\d,]+\.\d{2}) from ([^()]{1,100}?)\s?\((\d{4})\*+(\d{4})\) on (\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})\. Your transaction number is ([A-Z0-9]{10})\./;
const MAX_BIGINT = 9223372036854775807n;

function formatAmountSantim(amountSantim) {
  const amount = BigInt(amountSantim);
  const birr = (amount / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const santim = (amount % 100n).toString().padStart(2, '0');
  return `${birr}.${santim}`;
}

function isValidDateParts(year, month, day, hour, minute, second) {
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function parseTelebirrSms(body) {
  const normalized = body.replace(/\s+/g, ' ').trim();
  const match = normalized.match(smsPattern);
  if (!match) {
    return null;
  }

  const [, amount, payerName, , payerLast4, dayText, monthText, yearText, hourText, minuteText, secondText, txId] = match;
  const amountParts = amount.replace(/,/g, '').split('.');
  if (!/^\d+$/.test(amountParts[0])) {
    return null;
  }

  const amountSantim = BigInt(amountParts[0]) * 100n + BigInt(amountParts[1]);
  if (amountSantim < 1n || amountSantim > MAX_BIGINT) {
    return null;
  }

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (!isValidDateParts(year, month, day, hour, minute, second)) {
    return null;
  }

  const paidAt = new Date(0);
  paidAt.setUTCFullYear(year, month - 1, day);
  paidAt.setUTCHours(hour - 3, minute, second, 0);

  return {
    amountSantim: amountSantim.toString(),
    payerName: payerName.trim(),
    payerLast4,
    paidAt: paidAt.toISOString(),
    txId
  };
}

function smsSecretMatches(providedSecret, configuredSecret) {
  if (typeof providedSecret !== 'string' || typeof configuredSecret !== 'string') {
    return false;
  }

  const providedDigest = crypto.createHash('sha256').update(providedSecret).digest();
  const configuredDigest = crypto.createHash('sha256').update(configuredSecret).digest();
  return crypto.timingSafeEqual(providedDigest, configuredDigest);
}

async function lockTransactionId(transaction, txId) {
  await sequelize.query(
    'SELECT pg_advisory_xact_lock(hashtext(:txId))',
    { replacements: { txId }, transaction }
  );
}

async function matchPendingPayment(txId, transaction) {
  const payment = await TelebirrPayment.findByPk(txId, {
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  if (!payment || payment.bookingId !== null) {
    return false;
  }

  const submissions = await PaymentSubmission.findAll({
    where: { txId, status: 'pending' },
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  const bookingIds = [...new Set(submissions.map((submission) => Number(submission.bookingId)))];
  if (bookingIds.length !== 1 || submissions.length !== 1) {
    return false;
  }

  const submission = submissions[0];
  const booking = await Booking.findByPk(bookingIds[0], {
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  if (
    !booking
    || Number(submission.userId) !== Number(booking.customerId)
    || booking.status !== 'accepted'
    || booking.paymentStatus === 'paid'
    || booking.paymentStatus === 'cash_due'
    || booking.paymentMethod === 'cash'
    || booking.paidAt
    || booking.amountSantim === null
    || booking.amountSantim === undefined
    || !payment.paidAt
  ) {
    return false;
  }

  if (BigInt(payment.amountSantim) !== BigInt(booking.amountSantim)) {
    return false;
  }

  const earliestAllowedPayment = new Date(booking.createdAt).getTime() - 5 * 60 * 1000;
  if (new Date(payment.paidAt).getTime() < earliestAllowedPayment) {
    return false;
  }

  await payment.update({ bookingId: booking.id }, { transaction });
  await booking.update({
    paymentMethod: 'telebirr',
    paymentStatus: 'paid',
    paidAt: payment.paidAt
  }, { transaction });
  await submission.update({ status: 'verified' }, { transaction });
  return true;
}

async function submitTransactionId(user, { bookingId, txId }) {
  return sequelize.transaction(async (transaction) => {
    await lockTransactionId(transaction, txId);

    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!booking || Number(booking.customerId) !== Number(user.id)) {
      throw new AppError('Booking not found.', 404);
    }
    if (
      booking.status !== 'accepted'
      || !['unpaid', 'verifying'].includes(booking.paymentStatus)
      || booking.paymentMethod === 'cash'
      || booking.paidAt
    ) {
      throw new AppError('This booking is not available for payment verification.', 409);
    }
    if (booking.amountSantim === null || booking.amountSantim === undefined) {
      throw new AppError('The agreed booking amount has not been set.', 409);
    }

    await PaymentSubmission.findOrCreate({
      where: { bookingId, txId },
      defaults: {
        bookingId,
        userId: user.id,
        txId,
        status: 'pending'
      },
      transaction
    });
    await booking.update({
      paymentMethod: 'telebirr',
      paymentStatus: 'verifying'
    }, { transaction });

    const matched = await matchPendingPayment(txId, transaction);
    return { matched };
  });
}

async function getPaymentDetails(customerId, bookingId) {
  const booking = await Booking.findOne({
    where: { id: bookingId, customerId }
  });
  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }
  if (
    booking.status !== 'accepted'
    || !['unpaid', 'verifying'].includes(booking.paymentStatus)
    || booking.paymentMethod === 'cash'
    || booking.paidAt
  ) {
    throw new AppError('This booking is not available for Telebirr payment.', 409);
  }
  if (booking.amountSantim === null || booking.amountSantim === undefined) {
    throw new AppError('The agreed booking amount has not been set.', 409);
  }

  const number = process.env.TELEBIRR_NUMBER;
  const accountName = process.env.TELEBIRR_ACCOUNT_NAME;
  if (!number || !accountName) {
    throw new AppError('The Telebirr receiving account is not configured.', 503);
  }

  return {
    telebirrNumber: number,
    accountName,
    amountSantim: String(booking.amountSantim),
    amountBirr: formatAmountSantim(booking.amountSantim),
    paymentStatus: booking.paymentStatus
  };
}

async function getPaymentStatus(customerId, bookingId) {
  const booking = await Booking.findOne({
    where: { id: bookingId, customerId },
    attributes: ['id', 'paymentStatus', 'paymentMethod', 'paidAt']
  });
  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }

  return {
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod,
    paidAt: booking.paidAt
  };
}

async function receiveTelebirrSms({ from, text }) {
  if (from !== '127') {
    return { ignored: true, matched: false };
  }

  const parsed = parseTelebirrSms(text);
  return sequelize.transaction(async (transaction) => {
    await SmsLog.create({
      body: text,
      parsed,
      receivedAt: new Date()
    }, { transaction });

    if (!parsed) {
      return { ignored: false, matched: false };
    }

    await lockTransactionId(transaction, parsed.txId);
    const [payment, created] = await TelebirrPayment.findOrCreate({
      where: { txId: parsed.txId },
      defaults: {
        txId: parsed.txId,
        amountSantim: parsed.amountSantim,
        payerName: parsed.payerName,
        payerLast4: parsed.payerLast4,
        paidAt: parsed.paidAt,
        bookingId: null
      },
      transaction
    });

    if (!created) {
      return { ignored: false, matched: false, duplicate: true };
    }

    const matched = await matchPendingPayment(payment.txId, transaction);
    return { ignored: false, matched, duplicate: false };
  });
}

module.exports = {
  parseTelebirrSms,
  smsSecretMatches,
  lockTransactionId,
  submitTransactionId,
  getPaymentDetails,
  getPaymentStatus,
  receiveTelebirrSms
};
