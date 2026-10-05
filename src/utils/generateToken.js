const jwt = require('jsonwebtoken');
const AppError = require('./AppError');

function generateToken(user) {
  if (!user || user.id === undefined || user.id === null) {
    throw new TypeError('A user with an id is required to generate an authentication token.');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT authentication is not configured.', 500);
  }

  return jwt.sign(
    { sub: String(user.id) },
    secret,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

module.exports = generateToken;
