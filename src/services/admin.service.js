const {
  User,
  WorkerProfile,
  Skill,
  Booking,
  PaymentSubmission,
  SmsLog,
  TelebirrPayment,
  sequelize,
  Sequelize
} = require('../models');
const AppError = require('../utils/AppError');
const { lockTransactionId } = require('./telebirr.service');

const PUBLIC_USER_ATTRIBUTES = ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt', 'updatedAt'];
const MAX_BIGINT = 9223372036854775807n;
const PENDING_PROFILE_ATTRIBUTES = [
  'id', 'userId', 'skillId', 'bio', 'hourlyRate', 'city', 'area',
  'experienceYears', 'isApproved', 'createdAt', 'updatedAt'
];

async function listUsers() {
  return User.findAll({
    attributes: PUBLIC_USER_ATTRIBUTES,
    order: [['createdAt', 'DESC'], ['id', 'ASC']]
  });
}

async function setUserActiveStatus(userId, isActive) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  await user.update({ isActive });
  // Reload with an explicit allowlist so passwordHash cannot be exposed by this endpoint.
  return User.findByPk(userId, { attributes: PUBLIC_USER_ATTRIBUTES });
}

async function listPendingWorkers() {
  return WorkerProfile.findAll({
    where: { isApproved: false },
    attributes: PENDING_PROFILE_ATTRIBUTES,
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'isActive'] },
      { model: Skill, as: 'skill', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'ASC'], ['id', 'ASC']]
  });
}

async function listWorkers() {
  return WorkerProfile.findAll({
    attributes: PENDING_PROFILE_ATTRIBUTES,
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'isActive'] },
      { model: Skill, as: 'skill', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'ASC'], ['id', 'ASC']]
  });
}

async function setWorkerApprovalStatus(workerProfileId, isApproved) {
  const profile = await WorkerProfile.findByPk(workerProfileId);
  if (!profile) {
    throw new AppError('Worker profile not found.', 404);
  }

  await profile.update({ isApproved });
  return WorkerProfile.findByPk(workerProfileId, {
    attributes: PENDING_PROFILE_ATTRIBUTES,
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'isActive'] },
      { model: Skill, as: 'skill', attributes: ['id', 'name'] }
    ]
  });
}

async function approveWorker(workerProfileId) {
  return setWorkerApprovalStatus(workerProfileId, true);
}

async function setBookingAmount(bookingId, amountSantim) {
  return sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }
    if (booking.status !== 'accepted' || booking.paymentStatus !== 'unpaid' || booking.paidAt) {
      throw new AppError('Only accepted, unpaid bookings can be priced.', 409);
    }
    if (booking.amountSantim !== null && booking.amountSantim !== undefined) {
      throw new AppError('The agreed booking amount cannot be changed.', 409);
    }

    await booking.update({ amountSantim }, { transaction });
    return Booking.findByPk(bookingId, { transaction });
  });
}

async function listBookingsNeedingPrice() {
  return Booking.findAll({
    where: {
      status: 'accepted',
      paymentStatus: 'unpaid',
      paymentMethod: null,
      amountSantim: null,
      paidAt: null
    },
    attributes: ['id', 'customerId', 'workerId', 'description', 'address', 'scheduledDate', 'createdAt'],
    include: [
      { model: User, as: 'customer', attributes: ['id', 'name'] },
      { model: User, as: 'worker', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'ASC'], ['id', 'ASC']]
  });
}

async function listPaymentReview() {
  const submissions = await PaymentSubmission.findAll({
    where: { status: 'pending' },
    attributes: ['id', 'bookingId', 'userId', 'txId', 'status', 'createdAt'],
    include: [{
      model: Booking,
      as: 'booking',
      attributes: ['id', 'customerId', 'workerId', 'amountSantim', 'status', 'paymentStatus'],
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name'] },
        { model: User, as: 'worker', attributes: ['id', 'name'] }
      ]
    }],
    order: [['createdAt', 'ASC'], ['id', 'ASC']]
  });

  const txIds = [...new Set(submissions.map((submission) => submission.txId))];
  const receivedPayments = txIds.length
    ? await TelebirrPayment.findAll({
      where: { txId: { [Sequelize.Op.in]: txIds } },
      attributes: ['txId', 'amountSantim', 'payerName', 'payerLast4', 'paidAt', 'bookingId']
    })
    : [];
  const paymentsByTxId = new Map(receivedPayments.map((payment) => [payment.txId, payment]));

  const pendingSubmissions = submissions.map((submission) => {
    const item = submission.get({ plain: true });
    const payment = paymentsByTxId.get(item.txId);
    const expectedAmount = item.booking?.amountSantim;
    const amountDifferenceSantim = payment && expectedAmount !== null && expectedAmount !== undefined
      ? (BigInt(payment.amountSantim) - BigInt(expectedAmount)).toString()
      : null;
    return {
      ...item,
      payment: payment ? payment.get({ plain: true }) : null,
      amountDifferenceSantim
    };
  });

  const [unlinkedPayments, unparsedSms] = await Promise.all([
    TelebirrPayment.findAll({
      where: { bookingId: null },
      attributes: ['txId', 'amountSantim', 'payerName', 'payerLast4', 'paidAt', 'createdAt'],
      order: [['paidAt', 'DESC'], ['txId', 'ASC']]
    }),
    SmsLog.findAll({
      where: { parsed: null },
      attributes: ['id', 'body', 'receivedAt'],
      order: [['receivedAt', 'DESC'], ['id', 'DESC']]
    })
  ]);

  return {
    submissions: pendingSubmissions,
    unlinkedPayments,
    unparsedSms
  };
}

async function approvePaymentSubmission(submissionId, manualAmountSantim) {
  return sequelize.transaction(async (transaction) => {
    const initialSubmission = await PaymentSubmission.findByPk(submissionId);
    if (!initialSubmission) {
      throw new AppError('Payment submission not found.', 404);
    }

    await lockTransactionId(transaction, initialSubmission.txId);
    const submission = await PaymentSubmission.findByPk(submissionId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!submission || submission.status !== 'pending') {
      throw new AppError('This payment submission is no longer pending review.', 409);
    }

    const activeSubmissions = await PaymentSubmission.findAll({
      where: {
        txId: submission.txId,
        status: { [Sequelize.Op.in]: ['pending', 'verified'] }
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (activeSubmissions.length !== 1 || Number(activeSubmissions[0].id) !== Number(submission.id)) {
      throw new AppError('This transaction ID is submitted for more than one booking.', 409);
    }

    const booking = await Booking.findByPk(submission.bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!booking || Number(booking.customerId) !== Number(submission.userId)) {
      throw new AppError('The booking for this payment submission was not found.', 404);
    }
    if (
      booking.status !== 'accepted'
      || booking.paymentStatus === 'paid'
      || booking.paymentStatus === 'cash_due'
      || booking.paymentMethod === 'cash'
      || booking.paidAt
    ) {
      throw new AppError('This booking is not available for Telebirr payment approval.', 409);
    }
    if (booking.amountSantim === null || booking.amountSantim === undefined) {
      throw new AppError('Set the agreed booking amount before approving payment.', 409);
    }

    let payment = await TelebirrPayment.findByPk(submission.txId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (payment && payment.bookingId !== null && Number(payment.bookingId) !== Number(booking.id)) {
      throw new AppError('This Telebirr payment is already linked to another booking.', 409);
    }
    if (payment && !payment.paidAt) {
      throw new AppError('This payment has no verified receipt time.', 409);
    }

    if (!payment) {
      if (
        typeof manualAmountSantim !== 'string'
        || !/^[1-9]\d{0,18}$/.test(manualAmountSantim)
        || BigInt(manualAmountSantim) > MAX_BIGINT
      ) {
        throw new AppError('Enter the amount confirmed in Telebirr history, in santim.', 400);
      }
      payment = await TelebirrPayment.create({
        txId: submission.txId,
        amountSantim: manualAmountSantim,
        payerName: null,
        payerLast4: null,
        paidAt: new Date(),
        bookingId: booking.id
      }, { transaction });
    } else {
      await payment.update({ bookingId: booking.id }, { transaction });
    }

    await booking.update({
      paymentMethod: 'telebirr',
      paymentStatus: 'paid',
      paidAt: payment.paidAt
    }, { transaction });
    await submission.update({ status: 'verified' }, { transaction });

    return { booking, payment, submission };
  });
}

async function rejectPaymentSubmission(submissionId) {
  return sequelize.transaction(async (transaction) => {
    const submission = await PaymentSubmission.findByPk(submissionId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!submission) {
      throw new AppError('Payment submission not found.', 404);
    }
    if (submission.status !== 'pending') {
      throw new AppError('This payment submission is no longer pending review.', 409);
    }

    const booking = await Booking.findByPk(submission.bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!booking) {
      throw new AppError('The booking for this payment submission was not found.', 404);
    }
    if (booking.paymentStatus === 'paid' || booking.paidAt) {
      throw new AppError('A paid booking payment cannot be rejected.', 409);
    }

    await submission.update({ status: 'rejected' }, { transaction });
    const otherPendingSubmissions = await PaymentSubmission.count({
      where: {
        bookingId: booking.id,
        status: 'pending'
      },
      transaction
    });
    if (otherPendingSubmissions === 0 && booking.paymentStatus === 'verifying') {
      await booking.update({
        paymentMethod: null,
        paymentStatus: 'unpaid'
      }, { transaction });
    }

    return submission;
  });
}

async function listTelebirrPaidBookings() {
  return Booking.findAll({
    where: { paymentMethod: 'telebirr', paymentStatus: 'paid' },
    attributes: [
      'id', 'workerId', 'description', 'scheduledDate', 'amountSantim',
      'paidAt', 'workerPaidOutAt', 'status'
    ],
    include: [
      { model: User, as: 'worker', attributes: ['id', 'name', 'phone'] },
      {
        model: TelebirrPayment,
        as: 'telebirrPayment',
        attributes: ['txId', 'amountSantim']
      }
    ],
    order: [['paidAt', 'ASC'], ['id', 'ASC']]
  });
}

async function markWorkerPaid(bookingId) {
  return sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }
    if (
      booking.paymentMethod !== 'telebirr'
      || booking.paymentStatus !== 'paid'
      || !booking.paidAt
    ) {
      throw new AppError('Only Telebirr-paid bookings can be marked as paid to the worker.', 409);
    }
    if (booking.workerPaidOutAt) {
      throw new AppError('The worker has already been marked as paid for this booking.', 409);
    }

    await booking.update({ workerPaidOutAt: new Date() }, { transaction });
    return Booking.findByPk(bookingId, {
      transaction,
      include: [
        { model: User, as: 'worker', attributes: ['id', 'name', 'phone'] },
        {
          model: TelebirrPayment,
          as: 'telebirrPayment',
          attributes: ['txId', 'amountSantim']
        }
      ]
    });
  });
}

module.exports = {
  listUsers,
  setUserActiveStatus,
  listPendingWorkers,
  listWorkers,
  setWorkerApprovalStatus,
  approveWorker,
  setBookingAmount,
  listBookingsNeedingPrice,
  listPaymentReview,
  approvePaymentSubmission,
  rejectPaymentSubmission,
  listTelebirrPaidBookings,
  markWorkerPaid
};
