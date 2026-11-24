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

module.exports = { createJobOffer, listJobOffers, listMyJobOffers };
