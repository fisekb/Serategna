const asyncHandler = require('../utils/asyncHandler');
const reviewsService = require('../services/reviews.service');

const createReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.createReview(req.user.id, req.body);
  return res.status(201).json({
    success: true,
    message: 'Review created successfully.',
    data: { review }
  });
});

const listWorkerReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewsService.listWorkerReviews(Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Worker reviews retrieved successfully.',
    data: { reviews }
  });
});

module.exports = { createReview, listWorkerReviews };
