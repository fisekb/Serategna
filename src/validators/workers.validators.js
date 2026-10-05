const { body, param, query } = require('express-validator');

const MAX_RATE = 99999999.99;
const PROFILE_UPDATE_FIELDS = ['skillId', 'bio', 'hourlyRate', 'city', 'area', 'experienceYears'];

const createProfileValidators = [
  body('skillId')
    .isInt({ min: 1 }).withMessage('skillId must be a positive integer.')
    .toInt(),
  body('bio')
    .optional({ nullable: true })
    .isString().withMessage('Bio must be text.')
    .bail()
    .isLength({ max: 5000 }).withMessage('Bio must be 5000 characters or fewer.'),
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
  body('experienceYears')
    .optional()
    .isInt({ min: 0 }).withMessage('experienceYears must be a nonnegative integer.')
    .toInt()
];

const updateProfileValidators = [
  body('skillId').custom((_value, { req }) => {
    const fields = Object.keys(req.body || {});
    if (fields.length === 0 || !fields.some((field) => PROFILE_UPDATE_FIELDS.includes(field))) {
      throw new Error('Provide at least one profile field to update.');
    }
    if (fields.some((field) => !PROFILE_UPDATE_FIELDS.includes(field))) {
      throw new Error('Only profile fields may be updated.');
    }
    return true;
  }),
  body('skillId')
    .optional()
    .isInt({ min: 1 }).withMessage('skillId must be a positive integer.')
    .toInt(),
  body('bio')
    .optional({ nullable: true })
    .isString().withMessage('Bio must be text.')
    .bail()
    .isLength({ max: 5000 }).withMessage('Bio must be 5000 characters or fewer.'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0, max: MAX_RATE }).withMessage(`hourlyRate must be between 0 and ${MAX_RATE}.`)
    .toFloat(),
  body('city')
    .optional()
    .isString().withMessage('City must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('City cannot be empty.')
    .isLength({ max: 120 }).withMessage('City must be 120 characters or fewer.'),
  body('area')
    .optional({ nullable: true })
    .isString().withMessage('Area must be text.')
    .bail()
    .trim()
    .isLength({ max: 120 }).withMessage('Area must be 120 characters or fewer.'),
  body('experienceYears')
    .optional()
    .isInt({ min: 0 }).withMessage('experienceYears must be a nonnegative integer.')
    .toInt()
];

const workerListValidators = [
  query('skill')
    .optional()
    .isString().withMessage('skill must be a skill ID or name.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('skill must be 1–100 characters.'),
  query('city')
    .optional()
    .isString().withMessage('city must be text.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 120 }).withMessage('city must be 1–120 characters.'),
  query('area')
    .optional()
    .isString().withMessage('area must be text.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 120 }).withMessage('area must be 1–120 characters.'),
  query('minRate')
    .optional()
    .isFloat({ min: 0, max: MAX_RATE }).withMessage('minRate must be a nonnegative rate.')
    .toFloat(),
  query('maxRate')
    .optional()
    .isFloat({ min: 0, max: MAX_RATE }).withMessage('maxRate must be a nonnegative rate.')
    .toFloat()
    .custom((maxRate, { req }) => {
      if (req.query.minRate !== undefined && Number(req.query.minRate) > Number(maxRate)) {
        throw new Error('maxRate must be greater than or equal to minRate.');
      }
      return true;
    }),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer.')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be an integer between 1 and 100.')
    .toInt()
];

const workerIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Worker profile id must be a positive integer.').toInt()
];

module.exports = {
  createProfileValidators,
  updateProfileValidators,
  workerListValidators,
  workerIdValidator
};
