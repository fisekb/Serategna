const { body, param } = require('express-validator');

const MAX_RATE = 99999999.99;
const JOB_OFFER_FIELDS = ['skillId', 'hourlyRate', 'city', 'area', 'description'];

const createJobOfferValidators = [
  body('skillId').custom((_value, { req }) => {
    if (Object.keys(req.body || {}).some((field) => !JOB_OFFER_FIELDS.includes(field))) {
      throw new Error('Only job offer fields may be provided.');
    }
    return true;
  }),
  body('skillId')
    .isInt({ min: 1 }).withMessage('skillId must be a positive integer.')
    .toInt(),
  body('hourlyRate')
    .isFloat({ min: 0, max: MAX_RATE }).withMessage(`hourlyRate must be between 0 and ${MAX_RATE}.`)
    .toFloat(),
  body('city')
    .isString().withMessage('City must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('City is required.')
    .isLength({ max: 120 }).withMessage('City must be 120 characters or fewer.'),
  body('area')
    .optional({ nullable: true })
    .isString().withMessage('Area must be text.')
    .bail()
    .trim()
    .isLength({ max: 120 }).withMessage('Area must be 120 characters or fewer.'),
  body('description')
    .isString().withMessage('Description must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Description is required.')
    .isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.')
];

const jobOfferIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Job offer id must be a positive integer.').toInt()
];

module.exports = { createJobOfferValidators, jobOfferIdValidator };
