const asyncHandler = require('../utils/asyncHandler');
const skillsService = require('../services/skills.service');

const listSkills = asyncHandler(async (req, res) => {
  const skills = await skillsService.listSkills();
  return res.status(200).json({
    success: true,
    message: 'Skills retrieved successfully.',
    data: { skills }
  });
});

module.exports = { listSkills };
