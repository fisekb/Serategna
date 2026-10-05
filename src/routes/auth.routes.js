const express = require('express');
const { register, login, getCurrentUser } = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { registerValidators, loginValidators } = require('../validators/auth.validators');

const router = express.Router();

router.post('/register', registerValidators, validate, register);
router.post('/login', loginValidators, validate, login);
router.get('/me', authenticate, getCurrentUser);

module.exports = router;
