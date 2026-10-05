const { Booking, Review, WorkerProfile, User } = require('../models');
const AppError = require('../utils/AppError');

async function createReview(customerId, input) {
  const booking = await Booking.findByPk(input.bookingId);
  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }

  // Verify ownership before revealing whether the booking is reviewable.
  if (Number(booking.customerId) !== Number(customerId)) {
    throw new AppError('You are not allowed to review this booking.', 403);
  }

  if (booking.status !== 'completed') {
    throw new AppError('Only completed bookings can be reviewed.', 409);
  }

  const existingReview = await Review.findOne({
    where: { bookingId: booking.id },
    attributes: ['id']
  });
  if (existingReview) {
    throw new AppError('This booking has already been reviewed.', 409);
  }

  return Review.create({
    bookingId: booking.id,
    customerId,
    workerId: booking.workerId,
    rating: input.rating,
    comment: input.comment ?? null
  });
}

async function listWorkerReviews(workerProfileId) {
  // Public worker IDs refer to WorkerProfile IDs; only approved profiles are publicly discoverable.
  const workerProfile = await WorkerProfile.findOne({
    where: { id: workerProfileId, isApproved: true },
    attributes: ['id', 'userId']
  });
  if (!workerProfile) {
    throw new AppError('Approved worker profile not found.', 404);
  }

  return Review.findAll({
    where: { workerId: workerProfile.userId },
    attributes: ['id', 'bookingId', 'rating', 'comment', 'createdAt'],
    include: [{ model: User, as: 'customer', attributes: ['name'] }],
    order: [['createdAt', 'DESC']]
  });
}

module.exports = { createReview, listWorkerReviews };
