const asyncHandler = require('../utils/asyncHandler');
const telebirrService = require('../services/telebirr.service');

const submitTransactionId = asyncHandler(async (req, res) => {
  const result = await telebirrService.submitTransactionId(req.user, req.body);
  return res.status(result.matched ? 200 : 202).json({
    success: true,
    message: result.matched ? 'Payment verified.' : 'Verifying payment.',
    data: { matched: result.matched }
  });
});

const getPaymentDetails = asyncHandler(async (req, res) => {
  const payment = await telebirrService.getPaymentDetails(req.user.id, Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Payment details retrieved successfully.',
    data: { payment }
  });
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await telebirrService.getPaymentStatus(req.user.id, Number(req.params.id));
  return res.status(200).json({
    success: true,
    message: 'Payment status retrieved successfully.',
    data: { payment }
  });
});

const receiveSms = asyncHandler(async (req, res) => {
  const result = await telebirrService.receiveTelebirrSms(req.body);
  return res.status(200).json({
    success: true,
    message: result.duplicate ? 'Duplicate SMS recorded.' : 'SMS received.',
    data: { ignored: result.ignored, matched: result.matched }
  });
});

module.exports = {
  submitTransactionId,
  getPaymentDetails,
  getPaymentStatus,
  receiveSms
};
