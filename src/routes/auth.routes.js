const express = require('express');
const { register, login, getCurrentUser, updateCurrentUser } = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { registerValidators, loginValidators, updateCustomerProfileValidators } = require('../validators/auth.validators');

const router = express.Router();

router.post('/register', registerValidators, validate, register);
router.post('/login', loginValidators, validate, login);
router.get('/me', authenticate, getCurrentUser);
router.patch('/profile', authenticate, authorize('customer'), updateCustomerProfileValidators, validate, updateCurrentUser);

module.exports = router;
