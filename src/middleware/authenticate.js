const jwt = require('jsonwebtoken');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.get('authorization');
  const match = authorization && authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new AppError('Authentication is required. Provide a Bearer token.', 401);
  }

  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT authentication is not configured.', 500);
  }

  const payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (!payload || typeof payload === 'string' || !payload.sub) {
    throw new AppError('The authentication token is invalid.', 401);
  }

  const user = await User.findByPk(payload.sub, {
    attributes: { exclude: ['passwordHash'] }
  });

  // Read isActive from the database for every request so deactivation immediately revokes existing JWTs.
  if (!user || user.isActive !== true) {
    throw new AppError('The account associated with this token is unavailable.', 401);
  }

  req.user = user;
  next();
});

module.exports = authenticate;
