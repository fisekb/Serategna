const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');

const listUsers = asyncHandler(async (req, res) => {
  const users = await adminService.listUsers();
  return res.status(200).json({
    success: true,
    message: 'Users retrieved successfully.',
    data: { users }
  });
});

const setUserStatus = asyncHandler(async (req, res) => {
  const user = await adminService.setUserActiveStatus(Number(req.params.id), req.body.isActive);
  return res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
    data: { user }
  });
});

const listWorkers = asyncHandler(async (req, res) => {
  const workers = await adminService.listWorkers();
  return res.status(200).json({
    success: true,
    message: 'Worker profiles retrieved successfully.',
    data: { workers }
  });
});

const listPendingWorkers = asyncHandler(async (req, res) => {
  const workers = await adminService.listPendingWorkers();
  return res.status(200).json({
    success: true,
    message: 'Pending worker profiles retrieved successfully.',
    data: { workers }
  });
});

const setWorkerStatus = asyncHandler(async (req, res) => {
  const worker = await adminService.setWorkerApprovalStatus(Number(req.params.id), req.body.isApproved);
  return res.status(200).json({
    success: true,
    message: `Worker profile ${worker.isApproved ? 'approved' : 'set to pending'} successfully.`,
    data: { worker }
  });
});

const approveWorker = asyncHandler(async (req, res) => {
  const worker = await adminService.approveWorker(Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Worker profile approved successfully.',
    data: { worker }
  });
});

const setBookingAmount = asyncHandler(async (req, res) => {
  const booking = await adminService.setBookingAmount(Number(req.params.id), req.body.amountSantim);
  return res.status(200).json({
    success: true,
    message: 'Agreed booking amount saved.',
    data: { booking }
  });
});

const listPaymentReview = asyncHandler(async (_req, res) => {
  const review = await adminService.listPaymentReview();
  return res.status(200).json({
    success: true,
    message: 'Payment review items retrieved successfully.',
    data: review
  });
});

const approvePaymentSubmission = asyncHandler(async (req, res) => {
  const result = await adminService.approvePaymentSubmission(
    Number(req.params.id),
    req.body?.amountSantim
  );
  return res.status(200).json({
    success: true,
    message: 'Payment approved and booking marked paid.',
    data: result
  });
});

const rejectPaymentSubmission = asyncHandler(async (req, res) => {
  const submission = await adminService.rejectPaymentSubmission(Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Payment submission rejected.',
    data: { submission }
  });
});

const listTelebirrPaidBookings = asyncHandler(async (_req, res) => {
  const bookings = await adminService.listTelebirrPaidBookings();
  return res.status(200).json({
    success: true,
    message: 'Telebirr-paid bookings retrieved successfully.',
    data: { bookings }
  });
});

const markWorkerPaid = asyncHandler(async (req, res) => {
  const booking = await adminService.markWorkerPaid(Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Worker payout recorded.',
    data: { booking }
  });
});

module.exports = {
  listUsers,
  setUserStatus,
  listWorkers,
  listPendingWorkers,
  setWorkerStatus,
  approveWorker,
  setBookingAmount,
  listPaymentReview,
  approvePaymentSubmission,
  rejectPaymentSubmission,
  listTelebirrPaidBookings,
  markWorkerPaid
};
