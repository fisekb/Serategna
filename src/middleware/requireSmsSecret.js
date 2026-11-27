const AppError = require('../utils/AppError');
const { smsSecretMatches } = require('../services/telebirr.service');

function requireSmsSecret(req, res, next) {
  const configuredSecret = process.env.SMS_SECRET;
  if (typeof configuredSecret !== 'string' || configuredSecret.length < 32) {
    return next(new AppError('SMS webhook is not configured.', 500));
  }

  if (!smsSecretMatches(req.get('x-sms-secret'), configuredSecret)) {
    return next(new AppError('SMS webhook authentication failed.', 401));
  }

  return next();
}

module.exports = requireSmsSecret;
