const { param } = require('express-validator');

const bookingIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Booking id must be a positive integer.').toInt()
];

module.exports = { bookingIdValidator };
