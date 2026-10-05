const express = require('express');
const {
  createProfile,
  getOwnProfile,
  listWorkers,
  getWorker,
  updateProfile,
  deleteProfile
} = require('../controllers/workers.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createProfileValidators,
  updateProfileValidators,
  workerListValidators,
  workerIdValidator
} = require('../validators/workers.validators');
const { listWorkerReviews } = require('../controllers/reviews.controller');
const { workerReviewsValidator } = require('../validators/reviews.validators');

const router = express.Router();

// Authentication establishes req.user; authorization limits profile writes to workers.
router.post('/profile', authenticate, authorize('worker'), createProfileValidators, validate, createProfile);
router.get('/profile', authenticate, authorize('worker'), getOwnProfile);
router.put('/profile', authenticate, authorize('worker'), updateProfileValidators, validate, updateProfile);
router.delete('/profile', authenticate, authorize('worker'), deleteProfile);

router.get('/', workerListValidators, validate, listWorkers);
router.get('/:id/reviews', workerReviewsValidator, validate, listWorkerReviews);
router.get('/:id', workerIdValidator, validate, getWorker);

module.exports = router;
