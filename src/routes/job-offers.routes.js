const express = require('express');
const {
  createJobOffer,
  updateJobOffer,
  deleteJobOffer,
  acceptJobOffer,
  listJobOffers,
  listMyJobOffers
} = require('../controllers/job-offers.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createJobOfferValidators, jobOfferIdValidator } = require('../validators/job-offers.validators');

const router = express.Router();

router.get('/', authenticate, authorize('worker'), listJobOffers);
router.get('/mine', authenticate, authorize('customer'), listMyJobOffers);
router.post('/', authenticate, authorize('customer'), createJobOfferValidators, validate, createJobOffer);
router.put('/:id', authenticate, authorize('customer'), jobOfferIdValidator, createJobOfferValidators, validate, updateJobOffer);
router.delete('/:id', authenticate, authorize('customer'), jobOfferIdValidator, validate, deleteJobOffer);
router.patch('/:id/accept', authenticate, authorize('worker'), jobOfferIdValidator, validate, acceptJobOffer);

module.exports = router;
