const { body, param } = require('express-validator');

const createReviewValidators = [
  body('bookingId')
    .isInt({ min: 1 }).withMessage('bookingId must be a positive integer.')
    .toInt(),
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('rating must be an integer from 1 to 5.')
    .toInt(),
  body('comment')
    .optional({ nullable: true })
    .isString().withMessage('Comment must be text.')
    .bail()
    .trim()
    .isLength({ max: 5000 }).withMessage('Comment must be 5000 characters or fewer.')
];

const workerReviewsValidator = [
  param('id').isInt({ min: 1 }).withMessage('Worker profile id must be a positive integer.').toInt()
];

module.exports = { createReviewValidators, workerReviewsValidator };
