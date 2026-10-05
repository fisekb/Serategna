const express = require('express');
const {
  listUsers,
  setUserStatus,
  listPendingWorkers,
  approveWorker
} = require('../controllers/admin.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  updateUserStatusValidators,
  workerProfileIdValidator
} = require('../validators/admin.validators');

const router = express.Router();

// Every admin endpoint authenticates the current active account and then enforces the admin role.
router.use(authenticate, authorize('admin'));

router.get('/users', listUsers);
router.patch('/users/:id/status', updateUserStatusValidators, validate, setUserStatus);
router.get('/workers/pending', listPendingWorkers);
router.patch('/workers/:id/approve', workerProfileIdValidator, validate, approveWorker);

module.exports = router;
