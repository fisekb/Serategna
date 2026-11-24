const { JobOffer, Skill, User } = require('../models');
const AppError = require('../utils/AppError');

const offerIncludes = [
  { model: Skill, as: 'skill', attributes: ['id', 'name'] },
  { model: User, as: 'customer', attributes: ['id', 'name'] }
];

async function ensureSkillExists(skillId) {
  const skill = await Skill.findByPk(skillId, { attributes: ['id'] });
  if (!skill) {
    throw new AppError('The selected skill does not exist.', 400);
  }
}

async function createJobOffer(customerId, input) {
  await ensureSkillExists(input.skillId);
  const offer = await JobOffer.create({
    customerId,
    skillId: input.skillId,
    hourlyRate: input.hourlyRate,
    city: input.city,
    area: input.area ?? null,
    description: input.description
  });

  return JobOffer.findByPk(offer.id, { include: offerIncludes });
}

async function listJobOffers() {
  return JobOffer.findAll({
    include: offerIncludes,
    order: [['createdAt', 'DESC']]
  });
}

async function listMyJobOffers(customerId) {
  return JobOffer.findAll({
    where: { customerId },
    include: [{ model: Skill, as: 'skill', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']]
  });
}

module.exports = { createJobOffer, listJobOffers, listMyJobOffers };
