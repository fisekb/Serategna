const asyncHandler = require('../utils/asyncHandler');
const bookingsService = require('../services/bookings.service');

const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingsService.createBooking(req.user.id, req.body);
  return res.status(201).json({
    success: true,
    message: 'Booking request created successfully.',
    data: { booking }
  });
});

const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingsService.listMyBookings(req.user);
  return res.status(200).json({
    success: true,
    message: 'Bookings retrieved successfully.',
    data: { bookings }
  });
});

const getBookingWorkerContact = asyncHandler(async (req, res) => {
  const worker = await bookingsService.getAcceptedBookingWorkerContact(req.user.id, Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Worker contact retrieved successfully.',
    data: { worker }
  });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await bookingsService.updateBookingStatus(req.user, Number(req.params.id), req.body.status);
  return res.status(200).json({
    success: true,
    message: 'Booking status updated successfully.',
    data: { booking }
  });
});

module.exports = { createBooking, listMyBookings, getBookingWorkerContact, updateBookingStatus };
