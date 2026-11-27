const express = require('express');
const { body, param } = require('express-validator');
const { rateLimit } = require('express-rate-limit');
const {
  receiveSms,
  submitTransactionId,
  getPaymentDetails,
  getPaymentStatus
} = require('../controllers/telebirr.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ignoreNon127Sms = require('../middleware/ignoreNon127Sms');
const requireSmsSecret = require('../middleware/requireSmsSecret');
const validate = require('../middleware/validate');

const router = express.Router();

const bookingIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Booking id must be a positive integer.').toInt()
];

const paymentSubmissionRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user.id}:${req.body.bookingId}`,
  message: {
    success: false,
    message: 'Too many transaction ID submissions for this booking. Try again later.',
    data: null
  }
});

const paymentStatusRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user.id}:${req.params.id}`,
  message: {
    success: false,
    message: 'Too many payment status checks. Please try again shortly.',
    data: null
  }
});

const smsValidators = [
  body('from')
    .equals('127').withMessage('Only authenticated messages from sender 127 can be recorded.'),
  body('text')
    .isString().withMessage('text must be a string.')
    .bail()
    .isLength({ min: 1, max: 10000 }).withMessage('text must be between 1 and 10000 characters.')
];

const submissionValidators = [
  body('bookingId')
    .isInt({ min: 1 }).withMessage('bookingId must be a positive integer.')
    .toInt(),
  body('txId')
    .isString().withMessage('txId must be text.')
    .bail()
    .matches(/^[A-Za-z0-9]{10}$/).withMessage('txId must contain exactly 10 letters or digits.')
    .bail()
    .customSanitizer((value) => value.toUpperCase())
    .matches(/^[A-Z0-9]{10}$/).withMessage('txId must contain exactly 10 uppercase letters or digits.')
];

router.post('/sms', requireSmsSecret, ignoreNon127Sms, smsValidators, validate, receiveSms);
router.get('/bookings/:id/payment-details', authenticate, authorize('customer'), bookingIdValidator, validate, getPaymentDetails);
router.get('/bookings/:id/status', authenticate, authorize('customer'), bookingIdValidator, validate, paymentStatusRateLimiter, getPaymentStatus);
router.post('/submissions', authenticate, authorize('customer'), submissionValidators, validate, paymentSubmissionRateLimiter, submitTransactionId);

module.exports = router;
