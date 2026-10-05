const { Op } = require('sequelize');
const { WorkerProfile, User, Skill } = require('../models');
const AppError = require('../utils/AppError');

const PROFILE_ATTRIBUTES = [
  'id',
  'skillId',
  'bio',
  'hourlyRate',
  'city',
  'area',
  'experienceYears',
  'createdAt',
  'updatedAt'
];
const PROFILE_FIELDS = ['skillId', 'bio', 'hourlyRate', 'city', 'area', 'experienceYears'];

function publicIncludes(skillFilter) {
  const skillInclude = {
    model: Skill,
    as: 'skill',
    attributes: ['id', 'name']
  };

  if (skillFilter) {
    const isId = /^\d+$/.test(skillFilter);
    skillInclude.where = isId
      ? { id: Number(skillFilter) }
      : { name: { [Op.iLike]: `%${skillFilter}%` } };
    skillInclude.required = true;
  }

  return [
    // Expose the worker's user ID because Booking.workerId references Users, not WorkerProfiles.
    { model: User, as: 'user', attributes: ['id', 'name'] },
    skillInclude
  ];
}

function profileAttributes(input) {
  return Object.fromEntries(
    PROFILE_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(input, field))
      .map((field) => [field, input[field]])
  );
}

async function ensureSkillExists(skillId) {
  const skill = await Skill.findByPk(skillId, { attributes: ['id'] });
  if (!skill) {
    throw new AppError('The selected skill does not exist.', 400);
  }
}

async function createWorkerProfile(userId, input) {
  // The userId condition enforces one profile per authenticated user; the unique DB constraint closes races.
  const existingProfile = await WorkerProfile.findOne({
    where: { userId },
    attributes: ['id']
  });
  if (existingProfile) {
    throw new AppError('You already have a worker profile.', 409);
  }

  await ensureSkillExists(input.skillId);
  const profile = await WorkerProfile.create({
    ...profileAttributes(input),
    userId,
    bio: input.bio ?? null,
    area: input.area ?? null,
    experienceYears: input.experienceYears ?? 0,
    isApproved: false
  });

  return WorkerProfile.findByPk(profile.id, {
    attributes: PROFILE_ATTRIBUTES,
    include: publicIncludes()
  });
}

async function findOwnWorkerProfile(userId) {
  const profile = await WorkerProfile.findOne({
    where: { userId },
    attributes: PROFILE_ATTRIBUTES,
    include: publicIncludes()
  });

  if (!profile) {
    throw new AppError('Your worker profile was not found.', 404);
  }
  return profile;
}

async function listApprovedWorkers(filters) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const where = { isApproved: true };

  if (filters.city) {
    where.city = { [Op.iLike]: `%${filters.city}%` };
  }
  if (filters.area) {
    where.area = { [Op.iLike]: `%${filters.area}%` };
  }
  if (filters.minRate !== undefined || filters.maxRate !== undefined) {
    where.hourlyRate = {};
    if (filters.minRate !== undefined) {
      where.hourlyRate[Op.gte] = filters.minRate;
    }
    if (filters.maxRate !== undefined) {
      where.hourlyRate[Op.lte] = filters.maxRate;
    }
  }

  const result = await WorkerProfile.findAndCountAll({
    where,
    attributes: PROFILE_ATTRIBUTES,
    include: publicIncludes(filters.skill),
    order: [['id', 'ASC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  });

  return {
    workers: result.rows,
    pagination: {
      page,
      limit,
      total: result.count,
      totalPages: Math.ceil(result.count / limit)
    }
  };
}

async function findApprovedWorkerById(profileId) {
  const profile = await WorkerProfile.findOne({
    where: { id: profileId, isApproved: true },
    attributes: PROFILE_ATTRIBUTES,
    include: publicIncludes()
  });

  if (!profile) {
    throw new AppError('Approved worker profile not found.', 404);
  }
  return profile;
}

async function updateOwnWorkerProfile(userId, input) {
  // Scope the lookup to the authenticated owner so another profile cannot be targeted by request data.
  const profile = await WorkerProfile.findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('Your worker profile was not found.', 404);
  }

  const updates = profileAttributes(input);
  if (Object.prototype.hasOwnProperty.call(updates, 'skillId')) {
    await ensureSkillExists(updates.skillId);
  }

  await profile.update(updates);
  return WorkerProfile.findByPk(profile.id, {
    attributes: PROFILE_ATTRIBUTES,
    include: publicIncludes()
  });
}

async function deleteOwnWorkerProfile(userId) {
  // Delete by authenticated owner ID, never by an ID supplied by the caller.
  const deletedCount = await WorkerProfile.destroy({ where: { userId } });
  if (deletedCount === 0) {
    throw new AppError('Your worker profile was not found.', 404);
  }
}

module.exports = {
  createWorkerProfile,
  findOwnWorkerProfile,
  listApprovedWorkers,
  findApprovedWorkerById,
  updateOwnWorkerProfile,
  deleteOwnWorkerProfile
};
