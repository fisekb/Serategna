const express = require('express');
const { createBooking, listMyBookings, getBookingWorkerContact, updateBookingStatus } = require('../controllers/bookings.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createBookingValidators, bookingIdValidator, updateBookingStatusValidators } = require('../validators/bookings.validators');

const router = express.Router();

router.post('/', authenticate, authorize('customer'), createBookingValidators, validate, createBooking);
router.get('/my', authenticate, authorize('customer', 'worker'), listMyBookings);
router.get('/:id/worker-contact', authenticate, authorize('customer'), bookingIdValidator, validate, getBookingWorkerContact);
router.patch('/:id/status', authenticate, authorize('customer', 'worker'), updateBookingStatusValidators, validate, updateBookingStatus);

module.exports = router;
