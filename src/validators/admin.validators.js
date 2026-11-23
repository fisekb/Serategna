const { body, param } = require('express-validator');

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

module.exports = {
  userIdValidator,
  updateUserStatusValidators,
  workerProfileIdValidator,
  updateWorkerStatusValidators
};
