const { body } = require('express-validator');

const registerValidators = [
  body('name')
    .isString().withMessage('Name must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 120 }).withMessage('Name must be 120 characters or fewer.'),
  body('email')
    .isString().withMessage('Email must be text.')
    .bail()
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Enter a valid email address.')
    .isLength({ max: 255 }).withMessage('Email must be 255 characters or fewer.'),
  body('password')
    .isString().withMessage('Password must be text.')
    .bail()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
    .withMessage('Password must be no more than 72 bytes for bcrypt.'),
  body('role')
    .optional()
    .isIn(['customer', 'worker']).withMessage('Role must be either customer or worker.'),
  body('phone')
    .optional({ checkFalsy: true })
    .isString().withMessage('Phone must be text.')
    .bail()
    .trim()
    .isLength({ max: 32 }).withMessage('Phone must be 32 characters or fewer.')
];

const loginValidators = [
  body('email')
    .isString().withMessage('Email must be text.')
    .bail()
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Enter a valid email address.'),
  body('password')
    .isString().withMessage('Password must be text.')
    .bail()
    .notEmpty().withMessage('Password is required.')
];

const updateCustomerProfileValidators = [
  body('name').custom((_value, { req }) => {
    const allowedFields = ['name', 'phone'];
    const fields = Object.keys(req.body || {});
    if (fields.length === 0 || fields.some((field) => !allowedFields.includes(field))) {
      throw new Error('Provide only your name and phone number to update your profile.');
    }
    return true;
  }),
  body('name')
    .isString().withMessage('Name must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 120 }).withMessage('Name must be 120 characters or fewer.'),
  body('phone')
    .optional({ nullable: true })
    .isString().withMessage('Phone must be text.')
    .bail()
    .trim()
    .isLength({ max: 32 }).withMessage('Phone must be 32 characters or fewer.')
];

module.exports = { registerValidators, loginValidators, updateCustomerProfileValidators };
