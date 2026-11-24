const asyncHandler = require('../utils/asyncHandler');
const jobOffersService = require('../services/job-offers.service');

const createJobOffer = asyncHandler(async (req, res) => {
  const jobOffer = await jobOffersService.createJobOffer(req.user.id, req.body);
  return res.status(201).json({
    success: true,
    message: 'Job offer created successfully.',
    data: { jobOffer }
  });
});

const updateJobOffer = asyncHandler(async (req, res) => {
  const jobOffer = await jobOffersService.updateJobOffer(req.user.id, Number(req.params.id), req.body);
  return res.status(200).json({
    success: true,
    message: 'Job offer updated successfully.',
    data: { jobOffer }
  });
});

const deleteJobOffer = asyncHandler(async (req, res) => {
  await jobOffersService.deleteJobOffer(req.user.id, Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Job offer deleted successfully.',
    data: null
  });
});

const acceptJobOffer = asyncHandler(async (req, res) => {
  const jobOffer = await jobOffersService.acceptJobOffer(req.user.id, Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Job offer accepted successfully.',
    data: { jobOffer }
  });
});

const listJobOffers = asyncHandler(async (_req, res) => {
  const jobOffers = await jobOffersService.listJobOffers();
  return res.status(200).json({
    success: true,
    message: 'Job offers retrieved successfully.',
    data: { jobOffers }
  });
});

const listMyJobOffers = asyncHandler(async (req, res) => {
  const jobOffers = await jobOffersService.listMyJobOffers(req.user.id);
  return res.status(200).json({
    success: true,
    message: 'Your job offers were retrieved successfully.',
    data: { jobOffers }
  });
});

module.exports = {
  createJobOffer,
  updateJobOffer,
  deleteJobOffer,
  acceptJobOffer,
  listJobOffers,
  listMyJobOffers
};
