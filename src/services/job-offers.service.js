const { JobOffer, Skill, User, sequelize } = require('../models');
const AppError = require('../utils/AppError');

const offerIncludes = [
  { model: Skill, as: 'skill', attributes: ['id', 'name'] },
  { model: User, as: 'customer', attributes: ['id', 'name'] },
  { model: User, as: 'acceptedWorker', attributes: ['id', 'name'] }
];

async function ensureSkillExists(skillId, transaction) {
  const skill = await Skill.findByPk(skillId, { attributes: ['id'], transaction });
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

async function updateJobOffer(customerId, offerId, input) {
  return sequelize.transaction(async (transaction) => {
    const offer = await JobOffer.findOne({
      where: { id: offerId, customerId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!offer) {
      throw new AppError('Job offer not found.', 404);
    }
    if (offer.acceptedWorkerId) {
      throw new AppError('This job offer has already been accepted and cannot be edited.', 409);
    }

    await ensureSkillExists(input.skillId, transaction);
    await offer.update({
      skillId: input.skillId,
      hourlyRate: input.hourlyRate,
      city: input.city,
      area: input.area ?? null,
      description: input.description
    }, { transaction });

    return JobOffer.findByPk(offerId, { include: offerIncludes, transaction });
  });
}

async function deleteJobOffer(customerId, offerId) {
  return sequelize.transaction(async (transaction) => {
    const offer = await JobOffer.findOne({
      where: { id: offerId, customerId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!offer) {
      throw new AppError('Job offer not found.', 404);
    }
    if (offer.acceptedWorkerId) {
      throw new AppError('This job offer has already been accepted and cannot be deleted.', 409);
    }

    await offer.destroy({ transaction });
  });
}

async function acceptJobOffer(workerId, offerId) {
  return sequelize.transaction(async (transaction) => {
    const offer = await JobOffer.findByPk(offerId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!offer) {
      throw new AppError('Job offer not found.', 404);
    }
    if (offer.acceptedWorkerId) {
      throw new AppError('This job offer has already been accepted.', 409);
    }

    await offer.update({
      acceptedWorkerId: workerId,
      acceptedAt: new Date()
    }, { transaction });

    return JobOffer.findByPk(offerId, { include: offerIncludes, transaction });
  });
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
    include: [
      { model: Skill, as: 'skill', attributes: ['id', 'name'] },
      { model: User, as: 'acceptedWorker', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']]
  });
}

module.exports = {
  createJobOffer,
  updateJobOffer,
  deleteJobOffer,
  acceptJobOffer,
  listJobOffers,
  listMyJobOffers
};
