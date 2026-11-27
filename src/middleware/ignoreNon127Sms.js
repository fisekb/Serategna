function ignoreNon127Sms(req, res, next) {
  if (!req.body || req.body.from !== '127') {
    return res.status(200).json({
      success: true,
      message: 'SMS ignored.',
      data: null
    });
  }

  return next();
}

module.exports = ignoreNon127Sms;
