const express = require('express');
const { createJobOffer, listJobOffers, listMyJobOffers } = require('../controllers/job-offers.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createJobOfferValidators } = require('../validators/job-offers.validators');

const router = express.Router();

router.get('/', authenticate, authorize('worker'), listJobOffers);
router.get('/mine', authenticate, authorize('customer'), listMyJobOffers);
router.post('/', authenticate, authorize('customer'), createJobOfferValidators, validate, createJobOffer);

module.exports = router;
