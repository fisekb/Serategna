const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const {
  Booking,
  PaymentSubmission,
  SmsLog,
  TelebirrPayment,
  User,
  sequelize
} = require('../src/models');
const generateToken = require('../src/utils/generateToken');
const { parseTelebirrSms } = require('../src/services/telebirr.service');

const userIds = [];
const bookingIds = [];
const transactionIds = [];
const smsBodies = [];
let customer;
let worker;
let admin;

function nextTransactionId() {
  const txId = `P${crypto.randomBytes(8).toString('hex').slice(0, 9).toUpperCase()}`;
  transactionIds.push(txId);
  return txId;
}

function smsText(txId, amount, paidAt = new Date()) {
  const localTime = new Date(paidAt.getTime() + 3 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, '0');
  const text = `Dear customer You have received ETB ${amount} from Jane Doe (0912*3456) on ${pad(localTime.getUTCDate())}/${pad(localTime.getUTCMonth() + 1)}/${localTime.getUTCFullYear()} ${pad(localTime.getUTCHours())}:${pad(localTime.getUTCMinutes())}:${pad(localTime.getUTCSeconds())}. Your transaction number is ${txId}.`;
  smsBodies.push(text);
  return text;
}

function tokenFor(user) {
  return `Bearer ${generateToken({ id: user.id })}`;
}

async function createBooking(overrides = {}) {
  const booking = await Booking.create({
    customerId: customer.id,
    workerId: worker.id,
    description: 'Repair a sink',
    address: 'Bole, Addis Ababa',
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'accepted',
    amountSantim: '123450',
    ...overrides
  });
  bookingIds.push(booking.id);
  return booking;
}

async function createPendingSubmission(booking, txId) {
  await PaymentSubmission.create({
    bookingId: booking.id,
    userId: customer.id,
    txId,
    status: 'pending'
  });
  await booking.update({ paymentStatus: 'verifying' });
}

async function sendSms(text, secret = process.env.SMS_SECRET) {
  return request(app)
    .post('/api/telebirr/sms')
    .set('x-sms-secret', secret)
    .send({ from: '127', text });
}

async function submitId(booking, txId) {
  return request(app)
    .post('/api/telebirr/submissions')
    .set('Authorization', tokenFor(customer))
    .send({ bookingId: booking.id, txId });
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'payment-tests-jwt-secret';
  process.env.SMS_SECRET = 'telebirr-tests-secret-longer-than-32-characters';
  process.env.TELEBIRR_NUMBER = '+251911234567';
  process.env.TELEBIRR_ACCOUNT_NAME = 'Serategna Test Account';

  const expectedDatabase = process.env.DB_TEST_NAME || (process.env.DB_NAME && `${process.env.DB_NAME}_test`);
  if (!expectedDatabase || expectedDatabase === process.env.DB_NAME) {
    throw new Error('Payment integration tests require a dedicated DB_TEST_NAME database.');
  }
  await sequelize.authenticate();
  const [rows] = await sequelize.query('SELECT current_database() AS database_name');
  if (rows[0].database_name !== expectedDatabase) {
    throw new Error('Payment integration tests connected to an unexpected database.');
  }
}, 30000);

beforeEach(async () => {
  userIds.length = 0;
  bookingIds.length = 0;
  transactionIds.length = 0;
  smsBodies.length = 0;

  customer = await User.create({
    name: 'Payment Test Customer',
    email: `customer-${crypto.randomUUID()}@example.test`,
    passwordHash: 'test-hash',
    role: 'customer',
    isActive: true
  });
  worker = await User.create({
    name: 'Payment Test Worker',
    email: `worker-${crypto.randomUUID()}@example.test`,
    passwordHash: 'test-hash',
    role: 'worker',
    isActive: true
  });
  admin = await User.create({
    name: 'Payment Test Admin',
    email: `admin-${crypto.randomUUID()}@example.test`,
    passwordHash: 'test-hash',
    role: 'admin',
    isActive: true
  });
  userIds.push(customer.id, worker.id, admin.id);
});

afterEach(async () => {
  if (bookingIds.length) {
    await PaymentSubmission.destroy({ where: { bookingId: bookingIds } });
  }
  if (transactionIds.length) {
    await TelebirrPayment.destroy({ where: { txId: transactionIds } });
  }
  if (smsBodies.length) {
    await SmsLog.destroy({ where: { body: smsBodies } });
  }
  if (bookingIds.length) {
    await Booking.destroy({ where: { id: bookingIds } });
  }
  if (userIds.length) {
    await User.destroy({ where: { id: userIds } });
  }
});

afterAll(async () => {
  await sequelize.close();
});

describe('Telebirr SMS and payment matching', () => {
  test('parses the required SMS format and converts its UTC+3 time and amount exactly', () => {
    const parsed = parseTelebirrSms(
      ' Dear customer You have received ETB 1,234.50 from Jane Doe (0912*3456) on 26/11/2026 10:11:12. Your transaction number is ABCD123456. '
    );

    expect(parsed).toEqual({
      amountSantim: '123450',
      payerName: 'Jane Doe',
      payerLast4: '3456',
      paidAt: '2026-11-26T07:11:12.000Z',
      txId: 'ABCD123456'
    });
  });

  test('rejects a wrong webhook secret without logging the message', async () => {
    const response = await sendSms(smsText(nextTransactionId(), '1.00'), 'wrong-secret');

    expect(response.status).toBe(401);
    expect(await SmsLog.count()).toBe(0);
  });

  test('lets an admin set an agreed booking amount only once', async () => {
    const admin = await User.create({
      name: 'Payment Test Admin',
      email: `admin-${crypto.randomUUID()}@example.test`,
      passwordHash: 'test-hash',
      role: 'admin',
      isActive: true
    });
    userIds.push(admin.id);
    const booking = await createBooking({ amountSantim: null });
    const authorization = `Bearer ${generateToken({ id: admin.id })}`;

    const firstResponse = await request(app)
      .patch(`/api/admin/bookings/${booking.id}/amount`)
      .set('Authorization', authorization)
      .send({ amountSantim: '123450' });
    const secondResponse = await request(app)
      .patch(`/api/admin/bookings/${booking.id}/amount`)
      .set('Authorization', authorization)
      .send({ amountSantim: '123450' });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.data.booking.amountSantim).toBe('123450');
    expect(secondResponse.status).toBe(409);
  });

  test('does not accept a transaction ID until the booking amount is set', async () => {
    const booking = await createBooking({ amountSantim: null });
    const response = await submitId(booking, nextTransactionId());

    expect(response.status).toBe(409);
    expect((await Booking.findByPk(booking.id)).paymentStatus).toBe('unpaid');
    expect(await PaymentSubmission.count({ where: { bookingId: booking.id } })).toBe(0);
  });

  test('returns payment details only to the booking customer and uses the stored amount', async () => {
    const booking = await createBooking();
    const outsider = await User.create({
      name: 'Unrelated Customer',
      email: `outsider-${crypto.randomUUID()}@example.test`,
      passwordHash: 'test-hash',
      role: 'customer',
      isActive: true
    });
    userIds.push(outsider.id);

    const ownerResponse = await request(app)
      .get(`/api/telebirr/bookings/${booking.id}/payment-details`)
      .set('Authorization', tokenFor(customer));
    const outsiderResponse = await request(app)
      .get(`/api/telebirr/bookings/${booking.id}/payment-details`)
      .set('Authorization', tokenFor(outsider));

    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body.data.payment).toMatchObject({
      telebirrNumber: '+251911234567',
      accountName: 'Serategna Test Account',
      amountSantim: '123450',
      amountBirr: '1,234.50'
    });
    expect(outsiderResponse.status).toBe(404);
  });

  test('rejects invalid IDs and uppercases valid lowercase IDs', async () => {
    const booking = await createBooking();
    const invalidResponse = await submitId(booking, 'bad-id');
    const lowercaseResponse = await submitId(booking, 'abcd123456');
    const statusResponse = await request(app)
      .get(`/api/telebirr/bookings/${booking.id}/status`)
      .set('Authorization', tokenFor(customer));

    expect(invalidResponse.status).toBe(400);
    expect(lowercaseResponse.status).toBe(202);
    expect(statusResponse.body.data.payment.paymentStatus).toBe('verifying');
    expect(await PaymentSubmission.findOne({
      where: { bookingId: booking.id, txId: 'ABCD123456' }
    })).not.toBeNull();
  });

  test('limits transaction ID submissions to five per booking per hour', async () => {
    const booking = await createBooking();
    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(await submitId(booking, nextTransactionId()));
    }

    expect(responses.slice(0, 5).every((response) => response.status === 202)).toBe(true);
    expect(responses[5].status).toBe(429);
  });

  test('lets the booking customer choose cash with Pay later', async () => {
    const booking = await createBooking();
    const response = await request(app)
      .post(`/api/bookings/${booking.id}/pay-later`)
      .set('Authorization', tokenFor(customer));
    const updatedBooking = await Booking.findByPk(booking.id);

    expect(response.status).toBe(200);
    expect(updatedBooking).toMatchObject({
      paymentMethod: 'cash',
      paymentStatus: 'cash_due'
    });
    expect((await request(app)
      .get(`/api/telebirr/bookings/${booking.id}/payment-details`)
      .set('Authorization', tokenFor(customer))).status).toBe(409);
  });

  test('does not allow another customer to pay or accept a payment after the booking is paid', async () => {
    const booking = await createBooking();
    const outsider = await User.create({
      name: 'Unrelated Customer',
      email: `outsider-${crypto.randomUUID()}@example.test`,
      passwordHash: 'test-hash',
      role: 'customer',
      isActive: true
    });
    userIds.push(outsider.id);

    const outsiderResponse = await request(app)
      .post('/api/telebirr/submissions')
      .set('Authorization', tokenFor(outsider))
      .send({ bookingId: booking.id, txId: nextTransactionId() });
    expect(outsiderResponse.status).toBe(404);

    await booking.update({
      paymentStatus: 'paid',
      paymentMethod: 'telebirr',
      paidAt: new Date()
    });
    const paidSubmissionResponse = await submitId(booking, nextTransactionId());
    const paidDetailsResponse = await request(app)
      .get(`/api/telebirr/bookings/${booking.id}/payment-details`)
      .set('Authorization', tokenFor(customer));

    expect(paidSubmissionResponse.status).toBe(409);
    expect(paidDetailsResponse.status).toBe(409);
  });

  test('acknowledges and ignores a sender other than 127', async () => {
    const response = await request(app)
      .post('/api/telebirr/sms')
      .set('x-sms-secret', process.env.SMS_SECRET)
      .send({ from: '555', text: 'not a telebirr notification' });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(await SmsLog.count()).toBe(0);
  });

  test('logs duplicate SMS deliveries but creates only one payment record', async () => {
    const txId = nextTransactionId();
    const text = smsText(txId, '1,234.50');

    expect((await sendSms(text)).status).toBe(200);
    expect((await sendSms(text)).status).toBe(200);

    expect(await TelebirrPayment.count({ where: { txId } })).toBe(1);
    expect(await SmsLog.count({ where: { body: text } })).toBe(2);
    expect(await TelebirrPayment.findByPk(txId)).toMatchObject({
      amountSantim: '123450',
      bookingId: null
    });
  });

  test('matches when the customer submits the ID before its SMS arrives', async () => {
    const booking = await createBooking();
    const txId = nextTransactionId();
    const submissionResponse = await submitId(booking, txId);
    expect(submissionResponse.status).toBe(202);
    expect(submissionResponse.body.message).toBe('Verifying payment.');

    const smsResponse = await sendSms(smsText(txId, '1,234.50'));
    const updatedBooking = await Booking.findByPk(booking.id);

    expect(smsResponse.body.data.matched).toBe(true);
    expect(updatedBooking).toMatchObject({
      paymentMethod: 'telebirr',
      paymentStatus: 'paid'
    });
    expect(updatedBooking.paidAt).toBeInstanceOf(Date);
    expect((await TelebirrPayment.findByPk(txId)).bookingId).toBe(booking.id);
    expect(await PaymentSubmission.findOne({ where: { bookingId: booking.id, txId, status: 'verified' } })).not.toBeNull();
  });

  test('matches when the SMS arrives before the customer submits the ID', async () => {
    const booking = await createBooking();
    const txId = nextTransactionId();
    await sendSms(smsText(txId, '1,234.50'));

    const response = await submitId(booking, txId);
    const updatedBooking = await Booking.findByPk(booking.id);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Payment verified.');
    expect(updatedBooking.paymentStatus).toBe('paid');
    expect((await TelebirrPayment.findByPk(txId)).bookingId).toBe(booking.id);
  });

  test('serializes simultaneous SMS and submission arrivals without leaving either unmatched', async () => {
    const booking = await createBooking();
    const txId = nextTransactionId();
    const text = smsText(txId, '1,234.50');

    const [submissionResponse, smsResponse] = await Promise.all([
      submitId(booking, txId),
      sendSms(text)
    ]);

    const updatedBooking = await Booking.findByPk(booking.id);
    expect([200, 202]).toContain(submissionResponse.status);
    expect(smsResponse.status).toBe(200);
    expect(updatedBooking.paymentStatus).toBe('paid');
    expect((await TelebirrPayment.findByPk(txId)).bookingId).toBe(booking.id);
    expect(await PaymentSubmission.count({ where: { bookingId: booking.id, txId, status: 'pending' } })).toBe(0);
  });

  test('does not pay one booking twice for separate transaction IDs', async () => {
    const booking = await createBooking();
    const txIds = [nextTransactionId(), nextTransactionId()];
    await Promise.all(txIds.map((txId) => createPendingSubmission(booking, txId)));

    await Promise.all(txIds.map((txId) => sendSms(smsText(txId, '1,234.50'))));

    expect((await Booking.findByPk(booking.id)).paymentStatus).toBe('paid');
    expect(await TelebirrPayment.count({ where: { bookingId: booking.id } })).toBe(1);
    expect(await PaymentSubmission.count({ where: { bookingId: booking.id, status: 'verified' } })).toBe(1);
    expect(await PaymentSubmission.count({ where: { bookingId: booking.id, status: 'pending' } })).toBe(1);
  });

  test('leaves a wrong-amount payment unlinked and returns the same verifying response', async () => {
    const booking = await createBooking();
    const txId = nextTransactionId();
    await sendSms(smsText(txId, '12.35'));

    const response = await submitId(booking, txId);

    expect(response.status).toBe(202);
    expect(response.body.message).toBe('Verifying payment.');
    expect((await Booking.findByPk(booking.id)).paymentStatus).toBe('verifying');
    expect((await TelebirrPayment.findByPk(txId)).bookingId).toBeNull();
  });

  test('leaves a reused transaction ID unlinked when multiple bookings submitted it', async () => {
    const firstBooking = await createBooking();
    const secondBooking = await createBooking();
    const txId = nextTransactionId();
    await createPendingSubmission(firstBooking, txId);
    await createPendingSubmission(secondBooking, txId);

    const response = await sendSms(smsText(txId, '1,234.50'));

    expect(response.body.data.matched).toBe(false);
    expect((await TelebirrPayment.findByPk(txId)).bookingId).toBeNull();
    expect((await Booking.findByPk(firstBooking.id)).paymentStatus).toBe('verifying');
    expect((await Booking.findByPk(secondBooking.id)).paymentStatus).toBe('verifying');
    expect(await PaymentSubmission.count({ where: { txId, status: 'pending' } })).toBe(2);
  });

  test('does not match a payment older than five minutes before the booking', async () => {
    const booking = await createBooking();
    const txId = nextTransactionId();
    await createPendingSubmission(booking, txId);
    const oldPaymentAt = new Date(new Date(booking.createdAt).getTime() - 6 * 60 * 1000);

    await sendSms(smsText(txId, '1,234.50', oldPaymentAt));

    const response = await submitId(booking, txId);
    expect(response.status).toBe(202);
    expect(response.body.message).toBe('Verifying payment.');
    expect((await Booking.findByPk(booking.id)).paymentStatus).toBe('verifying');
    expect((await TelebirrPayment.findByPk(txId)).bookingId).toBeNull();
  });
});

describe('admin payment review and worker payouts', () => {
  function adminRequest(method, path) {
    return request(app)[method](path).set('Authorization', tokenFor(admin));
  }

  test('blocks non-admin access to payment review, decisions, and payout endpoints', async () => {
    const anonymousResponse = await request(app).get('/api/admin/payments/review');
    const workerResponse = await request(app)
      .get('/api/admin/payments/review')
      .set('Authorization', tokenFor(worker));
    const unpricedBookingsResponse = await request(app)
      .get('/api/admin/bookings/unpriced')
      .set('Authorization', tokenFor(worker));
    const rejectResponse = await request(app)
      .patch('/api/admin/payment-submissions/1/reject')
      .set('Authorization', tokenFor(customer));
    const payoutResponse = await request(app)
      .patch('/api/admin/bookings/1/worker-paid')
      .set('Authorization', tokenFor(worker));

    expect(anonymousResponse.status).toBe(401);
    expect(workerResponse.status).toBe(403);
    expect(unpricedBookingsResponse.status).toBe(403);
    expect(rejectResponse.status).toBe(403);
    expect(payoutResponse.status).toBe(403);
  });

  test('lists accepted bookings without a price and removes them after the admin sets one', async () => {
    const booking = await createBooking({ amountSantim: null });
    const firstList = await adminRequest('get', '/api/admin/bookings/unpriced');

    expect(firstList.status).toBe(200);
    expect(firstList.body.data.bookings.map((item) => item.id)).toContain(booking.id);

    const priceResponse = await adminRequest('patch', `/api/admin/bookings/${booking.id}/amount`)
      .send({ amountSantim: '100' });
    const refreshedList = await adminRequest('get', '/api/admin/bookings/unpriced');

    expect(priceResponse.status).toBe(200);
    expect(priceResponse.body.data.booking.amountSantim).toBe('100');
    expect(refreshedList.body.data.bookings.map((item) => item.id)).not.toContain(booking.id);
  });

  test('lists pending receipt amount and difference, then approves the submission', async () => {
    const booking = await createBooking();
    const txId = nextTransactionId();
    const unlinkedTxId = nextTransactionId();
    const unparsedBody = 'Unrecognized SMS sent to the test webhook';
    smsBodies.push(unparsedBody);
    await createPendingSubmission(booking, txId);
    await sendSms(smsText(txId, '12.35'));
    await TelebirrPayment.create({
      txId: unlinkedTxId,
      amountSantim: '200',
      paidAt: new Date(),
      bookingId: null
    });
    await SmsLog.create({ body: unparsedBody, parsed: null, receivedAt: new Date() });

    const reviewResponse = await adminRequest('get', '/api/admin/payments/review');
    const reviewItem = reviewResponse.body.data.submissions.find((item) => item.txId === txId);

    expect(reviewResponse.status).toBe(200);
    expect(reviewItem.payment.amountSantim).toBe('1235');
    expect(reviewItem.amountDifferenceSantim).toBe('-122215');
    expect(reviewResponse.body.data.unlinkedPayments.map((item) => item.txId)).toContain(unlinkedTxId);
    expect(reviewResponse.body.data.unparsedSms.map((item) => item.body)).toContain(unparsedBody);

    const approvalResponse = await adminRequest(
      'patch',
      `/api/admin/payment-submissions/${reviewItem.id}/approve`
    ).send({});

    expect(approvalResponse.status).toBe(200);
    expect((await Booking.findByPk(booking.id)).paymentStatus).toBe('paid');
    expect((await TelebirrPayment.findByPk(txId)).bookingId).toBe(booking.id);
    expect((await PaymentSubmission.findOne({ where: { bookingId: booking.id, txId } })).status).toBe('verified');
  });

  test('rejects a pending submission and makes an otherwise idle booking payable again', async () => {
    const booking = await createBooking();
    const txId = nextTransactionId();
    await createPendingSubmission(booking, txId);
    const submission = await PaymentSubmission.findOne({ where: { bookingId: booking.id, txId } });

    const response = await adminRequest(
      'patch',
      `/api/admin/payment-submissions/${submission.id}/reject`
    ).send({});

    expect(response.status).toBe(200);
    expect((await PaymentSubmission.findByPk(submission.id)).status).toBe('rejected');
    expect(await Booking.findByPk(booking.id)).toMatchObject({
      paymentMethod: null,
      paymentStatus: 'unpaid'
    });
  });

  test('manual approval saves the transaction ID so a late SMS cannot reuse it', async () => {
    const booking = await createBooking({ amountSantim: '100' });
    const txId = nextTransactionId();
    await createPendingSubmission(booking, txId);
    const submission = await PaymentSubmission.findOne({ where: { bookingId: booking.id, txId } });

    const approvalResponse = await adminRequest(
      'patch',
      `/api/admin/payment-submissions/${submission.id}/approve`
    ).send({ amountSantim: '100' });
    const paymentBeforeSms = await TelebirrPayment.findByPk(txId);
    const smsResponse = await sendSms(smsText(txId, '1.00'));
    const paymentAfterSms = await TelebirrPayment.findByPk(txId);

    expect(approvalResponse.status).toBe(200);
    expect(paymentBeforeSms.bookingId).toBe(booking.id);
    expect(smsResponse.body.data.matched).toBe(false);
    expect(smsResponse.body.message).toBe('Duplicate SMS recorded.');
    expect(paymentAfterSms.bookingId).toBe(booking.id);
    expect(paymentAfterSms.amountSantim).toBe('100');
    expect(await Booking.findByPk(booking.id)).toMatchObject({ paymentStatus: 'paid', paymentMethod: 'telebirr' });
  });

  test('does not let a manually approved payment pay another booking', async () => {
    const firstBooking = await createBooking({ amountSantim: '100' });
    const secondBooking = await createBooking({ amountSantim: '100' });
    const txId = nextTransactionId();
    await createPendingSubmission(firstBooking, txId);
    const firstSubmission = await PaymentSubmission.findOne({ where: { bookingId: firstBooking.id, txId } });
    const firstApproval = await adminRequest(
      'patch',
      `/api/admin/payment-submissions/${firstSubmission.id}/approve`
    ).send({ amountSantim: '100' });
    const secondSubmissionResponse = await submitId(secondBooking, txId);
    const secondSubmission = await PaymentSubmission.findOne({ where: { bookingId: secondBooking.id, txId } });
    const secondApproval = await adminRequest(
      'patch',
      `/api/admin/payment-submissions/${secondSubmission.id}/approve`
    ).send({ amountSantim: '100' });

    expect(firstApproval.status).toBe(200);
    expect(secondSubmissionResponse.status).toBe(202);
    expect(secondApproval.status).toBe(409);
    expect((await Booking.findByPk(firstBooking.id)).paymentStatus).toBe('paid');
    expect((await Booking.findByPk(secondBooking.id)).paymentStatus).toBe('verifying');
    expect((await TelebirrPayment.findByPk(txId)).bookingId).toBe(firstBooking.id);
    expect(await TelebirrPayment.count({ where: { txId } })).toBe(1);
  });

  test('lists Telebirr-paid bookings and records a worker payout once', async () => {
    const booking = await createBooking();
    const txId = nextTransactionId();
    const paidAt = new Date();
    await TelebirrPayment.create({
      txId,
      amountSantim: booking.amountSantim,
      paidAt,
      bookingId: booking.id
    });
    await booking.update({
      paymentMethod: 'telebirr',
      paymentStatus: 'paid',
      paidAt
    });

    const listResponse = await adminRequest('get', '/api/admin/payments/paid-bookings');
    const paidBooking = listResponse.body.data.bookings.find((item) => item.id === booking.id);
    const payoutResponse = await adminRequest(
      'patch',
      `/api/admin/bookings/${booking.id}/worker-paid`
    ).send({});
    const duplicatePayoutResponse = await adminRequest(
      'patch',
      `/api/admin/bookings/${booking.id}/worker-paid`
    ).send({});

    expect(listResponse.status).toBe(200);
    expect(paidBooking.worker.name).toBe(worker.name);
    expect(paidBooking.amountSantim).toBe('123450');
    expect(paidBooking.workerPaidOutAt).toBeNull();
    expect(payoutResponse.status).toBe(200);
    expect(payoutResponse.body.data.booking.workerPaidOutAt).toBeTruthy();
    expect(duplicatePayoutResponse.status).toBe(409);
  });
});
