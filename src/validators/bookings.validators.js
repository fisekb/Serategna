const { body, param } = require('express-validator');

const bookingStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];

const createBookingValidators = [
  body('workerId')
    .isInt({ min: 1 }).withMessage('workerId must be a positive integer.')
    .toInt(),
  body('description')
    .isString().withMessage('Description must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Description is required.')
    .isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.'),
  body('address')
    .isString().withMessage('Address must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Address is required.')
    .isLength({ max: 255 }).withMessage('Address must be 255 characters or fewer.'),
  body('scheduledDate')
    .isISO8601({ strict: true }).withMessage('scheduledDate must be a valid ISO 8601 date and time.')
    .bail()
    .custom((value) => new Date(value).getTime() > Date.now())
    .withMessage('scheduledDate must be in the future.')
];

const bookingIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Booking id must be a positive integer.').toInt()
];

const updateBookingStatusValidators = [
  ...bookingIdValidator,
  body('status')
    .isString().withMessage('status must be text.')
    .bail()
    .isIn(bookingStatuses.filter((status) => status !== 'pending'))
    .withMessage('status must be accepted, rejected, completed, or cancelled.')
];

module.exports = { createBookingValidators, bookingIdValidator, updateBookingStatusValidators };
