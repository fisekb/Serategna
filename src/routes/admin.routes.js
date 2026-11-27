const express = require('express');
const {
  listUsers,
  setUserStatus,
  listWorkers,
  listPendingWorkers,
  setWorkerStatus,
  approveWorker,
  setBookingAmount,
  listPaymentReview,
  approvePaymentSubmission,
  rejectPaymentSubmission,
  listTelebirrPaidBookings,
  markWorkerPaid
} = require('../controllers/admin.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  updateUserStatusValidators,
  workerProfileIdValidator,
  updateWorkerStatusValidators,
  setBookingAmountValidators,
  paymentSubmissionIdValidator,
  approvePaymentSubmissionValidators,
  payoutBookingIdValidator
} = require('../validators/admin.validators');

const router = express.Router();

// Every admin endpoint authenticates the current active account and then enforces the admin role.
router.use(authenticate, authorize('admin'));

router.get('/users', listUsers);
router.patch('/users/:id/status', updateUserStatusValidators, validate, setUserStatus);
router.get('/workers', listWorkers);
router.get('/workers/pending', listPendingWorkers);
router.patch('/workers/:id/status', updateWorkerStatusValidators, validate, setWorkerStatus);
router.patch('/workers/:id/approve', workerProfileIdValidator, validate, approveWorker);
router.patch('/bookings/:id/amount', setBookingAmountValidators, validate, setBookingAmount);
router.get('/payments/review', listPaymentReview);
router.get('/payments/paid-bookings', listTelebirrPaidBookings);
router.patch(
  '/payment-submissions/:id/approve',
  approvePaymentSubmissionValidators,
  validate,
  approvePaymentSubmission
);
router.patch(
  '/payment-submissions/:id/reject',
  paymentSubmissionIdValidator,
  validate,
  rejectPaymentSubmission
);
router.patch(
  '/bookings/:id/worker-paid',
  payoutBookingIdValidator,
  validate,
  markWorkerPaid
);

module.exports = router;
