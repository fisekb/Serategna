const { body, param } = require('express-validator');

const MAX_BIGINT = 9223372036854775807n;

const userIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('User id must be a positive integer.').toInt()
];

const updateUserStatusValidators = [
  ...userIdValidator,
  body('isActive')
    .isBoolean({ strict: true }).withMessage('isActive must be a boolean.')
    .toBoolean({ strict: true })
];

const workerProfileIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Worker profile id must be a positive integer.').toInt()
];

const updateWorkerStatusValidators = [
  ...workerProfileIdValidator,
  body('isApproved')
    .isBoolean({ strict: true }).withMessage('isApproved must be a boolean.')
    .toBoolean({ strict: true })
];

const setBookingAmountValidators = [
  param('id').isInt({ min: 1 }).withMessage('Booking id must be a positive integer.').toInt(),
  body('amountSantim')
    .custom((value) => {
      if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > MAX_BIGINT) {
        throw new Error('amountSantim must be a positive integer string within the supported range.');
      }
      return true;
    })
];

const paymentSubmissionIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Payment submission id must be a positive integer.').toInt()
];

const approvePaymentSubmissionValidators = [
  ...paymentSubmissionIdValidator,
  body('amountSantim')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > MAX_BIGINT) {
        throw new Error('amountSantim must be a positive integer string within the supported range.');
      }
      return true;
    })
];

const payoutBookingIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Booking id must be a positive integer.').toInt()
];

module.exports = {
  userIdValidator,
  updateUserStatusValidators,
  workerProfileIdValidator,
  updateWorkerStatusValidators,
  setBookingAmountValidators,
  paymentSubmissionIdValidator,
  approvePaymentSubmissionValidators,
  payoutBookingIdValidator
};
