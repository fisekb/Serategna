const bcrypt = require('bcrypt');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const BCRYPT_SALT_ROUNDS = 12;

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

const register = asyncHandler(async (req, res) => {
  // Keep this guard even though the route validates roles, so this controller never creates admins.
  const role = req.body.role || 'customer';
  if (!['customer', 'worker'].includes(role)) {
    throw new AppError('Role must be either customer or worker.', 400);
  }

  const passwordHash = await bcrypt.hash(req.body.password, BCRYPT_SALT_ROUNDS);
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone || null,
    passwordHash,
    role
  });

  return res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: { user: toPublicUser(user) }
  });
});

const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  const passwordMatches = user && await bcrypt.compare(req.body.password, user.passwordHash);

  // Use the same response for unknown emails and incorrect passwords.
  if (!passwordMatches || !user.isActive) {
    throw new AppError('Invalid email or password.', 401);
  }

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: {
      user: toPublicUser(user),
      token: generateToken(user)
    }
  });
});

const getCurrentUser = asyncHandler(async (req, res) => res.status(200).json({
  success: true,
  message: 'Current user retrieved successfully.',
  data: { user: toPublicUser(req.user) }
}));

module.exports = { register, login, getCurrentUser };
