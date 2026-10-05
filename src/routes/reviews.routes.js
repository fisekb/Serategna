const express = require('express');
const { createReview } = require('../controllers/reviews.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createReviewValidators } = require('../validators/reviews.validators');

const router = express.Router();

router.post('/', authenticate, authorize('customer'), createReviewValidators, validate, createReview);

module.exports = router;
