const { Booking, User, WorkerProfile, sequelize } = require('../models');
const AppError = require('../utils/AppError');

const bookingIncludes = [
  { model: User, as: 'customer', attributes: ['id', 'name'] },
  { model: User, as: 'worker', attributes: ['id', 'name'] }
];

async function createBooking(customerId, input) {
  if (Number(customerId) === Number(input.workerId)) {
    throw new AppError('You cannot book yourself as a worker.', 400);
  }

  const workerProfile = await WorkerProfile.findOne({
    where: { userId: input.workerId, isApproved: true },
    attributes: ['id']
  });
  if (!workerProfile) {
    throw new AppError('The selected worker is unavailable.', 404);
  }

  const booking = await Booking.create({
    customerId,
    workerId: input.workerId,
    description: input.description,
    address: input.address,
    scheduledDate: new Date(input.scheduledDate),
    status: 'pending'
  });

  return Booking.findByPk(booking.id, { include: bookingIncludes });
}

async function listMyBookings(user) {
  let where;
  if (user.role === 'customer') {
    where = { customerId: user.id };
  } else if (user.role === 'worker') {
    where = { workerId: user.id };
  } else {
    throw new AppError('Only customers and workers can view personal bookings.', 403);
  }

  return Booking.findAll({
    where,
    include: bookingIncludes,
    order: [['createdAt', 'DESC']]
  });
}

function assertAllowedTransition(role, targetStatus) {
  if (role === 'worker') {
    if (!['accepted', 'rejected', 'completed'].includes(targetStatus)) {
      throw new AppError('Workers may accept, reject, or complete bookings.', 403);
    }
    return;
  }

  if (role === 'customer') {
    if (targetStatus !== 'cancelled') {
      throw new AppError('Customers may only cancel bookings.', 403);
    }
    return;
  }

  throw new AppError('Only customers and workers can change booking status.', 403);
}

async function updateBookingStatus(user, bookingId, targetStatus) {
  assertAllowedTransition(user.role, targetStatus);

  return sequelize.transaction(async (transaction) => {
    // Lock the row so two concurrent requests cannot both transition the same prior status.
    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    const isOwner = user.role === 'worker'
      ? Number(booking.workerId) === Number(user.id)
      : Number(booking.customerId) === Number(user.id);
    if (!isOwner) {
      throw new AppError('You are not allowed to change this booking.', 403);
    }

    const allowedNextStatuses = {
      pending: user.role === 'worker' ? ['accepted', 'rejected'] : ['cancelled'],
      accepted: user.role === 'worker' ? ['completed'] : ['cancelled'],
      rejected: [],
      completed: [],
      cancelled: []
    };

    if (!allowedNextStatuses[booking.status]?.includes(targetStatus)) {
      throw new AppError(`A booking cannot transition from ${booking.status} to ${targetStatus}.`, 409);
    }

    await booking.update({ status: targetStatus }, { transaction });
    return Booking.findByPk(booking.id, { include: bookingIncludes, transaction });
  });
}

module.exports = { createBooking, listMyBookings, updateBookingStatus };
