const { User, WorkerProfile, Skill } = require('../models');
const AppError = require('../utils/AppError');

const PUBLIC_USER_ATTRIBUTES = ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt', 'updatedAt'];
const PENDING_PROFILE_ATTRIBUTES = [
  'id', 'userId', 'skillId', 'bio', 'hourlyRate', 'city', 'area',
  'experienceYears', 'isApproved', 'createdAt', 'updatedAt'
];

async function listUsers() {
  return User.findAll({
    attributes: PUBLIC_USER_ATTRIBUTES,
    order: [['createdAt', 'DESC'], ['id', 'ASC']]
  });
}

async function setUserActiveStatus(userId, isActive) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  await user.update({ isActive });
  // Reload with an explicit allowlist so passwordHash cannot be exposed by this endpoint.
  return User.findByPk(userId, { attributes: PUBLIC_USER_ATTRIBUTES });
}

async function listPendingWorkers() {
  return WorkerProfile.findAll({
    where: { isApproved: false },
    attributes: PENDING_PROFILE_ATTRIBUTES,
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'isActive'] },
      { model: Skill, as: 'skill', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'ASC'], ['id', 'ASC']]
  });
}

async function approveWorker(workerProfileId) {
  const profile = await WorkerProfile.findByPk(workerProfileId);
  if (!profile) {
    throw new AppError('Worker profile not found.', 404);
  }
  if (profile.isApproved) {
    throw new AppError('Worker profile has already been approved.', 409);
  }

  await profile.update({ isApproved: true });
  return WorkerProfile.findByPk(workerProfileId, {
    attributes: PENDING_PROFILE_ATTRIBUTES,
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'isActive'] },
      { model: Skill, as: 'skill', attributes: ['id', 'name'] }
    ]
  });
}

module.exports = { listUsers, setUserActiveStatus, listPendingWorkers, approveWorker };
