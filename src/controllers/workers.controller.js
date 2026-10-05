const asyncHandler = require('../utils/asyncHandler');
const workersService = require('../services/workers.service');

const createProfile = asyncHandler(async (req, res) => {
  const profile = await workersService.createWorkerProfile(req.user.id, req.body);
  return res.status(201).json({
    success: true,
    message: 'Worker profile created and submitted for approval.',
    data: { profile }
  });
});

const getOwnProfile = asyncHandler(async (req, res) => {
  const profile = await workersService.findOwnWorkerProfile(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Your worker profile was retrieved successfully.',
    data: { profile }
  });
});

const listWorkers = asyncHandler(async (req, res) => {
  const result = await workersService.listApprovedWorkers(req.query);
  return res.status(200).json({
    success: true,
    message: 'Approved workers retrieved successfully.',
    data: result
  });
});

const getWorker = asyncHandler(async (req, res) => {
  const profile = await workersService.findApprovedWorkerById(Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Worker profile retrieved successfully.',
    data: { profile }
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await workersService.updateOwnWorkerProfile(req.user.id, req.body);
  return res.status(200).json({
    success: true,
    message: 'Worker profile updated successfully.',
    data: { profile }
  });
});

const deleteProfile = asyncHandler(async (req, res) => {
  await workersService.deleteOwnWorkerProfile(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Worker profile deleted successfully.',
    data: null
  });
});

module.exports = { createProfile, getOwnProfile, listWorkers, getWorker, updateProfile, deleteProfile };
