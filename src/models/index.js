const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const User = require('./User')(sequelize, DataTypes);
const Skill = require('./Skill')(sequelize, DataTypes);
const WorkerProfile = require('./WorkerProfile')(sequelize, DataTypes);
const Booking = require('./Booking')(sequelize, DataTypes);
const Review = require('./Review')(sequelize, DataTypes);
const JobOffer = require('./JobOffer')(sequelize, DataTypes);
const TelebirrPayment = require('./TelebirrPayment')(sequelize, DataTypes);
const PaymentSubmission = require('./PaymentSubmission')(sequelize, DataTypes);
const SmsLog = require('./SmsLog')(sequelize, DataTypes);

// Keep relationship definitions in one place so models share consistent aliases and delete rules.
User.hasOne(WorkerProfile, {
  as: 'workerProfile',
  foreignKey: 'userId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
WorkerProfile.belongsTo(User, {
  as: 'user',
  foreignKey: 'userId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Skill.hasMany(WorkerProfile, {
  as: 'workerProfiles',
  foreignKey: 'skillId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
WorkerProfile.belongsTo(Skill, {
  as: 'skill',
  foreignKey: 'skillId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

User.hasMany(JobOffer, {
  as: 'jobOffers',
  foreignKey: 'customerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
JobOffer.belongsTo(User, {
  as: 'customer',
  foreignKey: 'customerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
User.hasMany(JobOffer, {
  as: 'acceptedJobOffers',
  foreignKey: 'acceptedWorkerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
JobOffer.belongsTo(User, {
  as: 'acceptedWorker',
  foreignKey: 'acceptedWorkerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

Skill.hasMany(JobOffer, {
  as: 'jobOffers',
  foreignKey: 'skillId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
JobOffer.belongsTo(Skill, {
  as: 'skill',
  foreignKey: 'skillId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

User.hasMany(Booking, {
  as: 'customerBookings',
  foreignKey: 'customerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Booking.belongsTo(User, {
  as: 'customer',
  foreignKey: 'customerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
User.hasMany(Booking, {
  as: 'workerBookings',
  foreignKey: 'workerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Booking.belongsTo(User, {
  as: 'worker',
  foreignKey: 'workerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

Booking.hasOne(TelebirrPayment, {
  as: 'telebirrPayment',
  foreignKey: 'bookingId',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
TelebirrPayment.belongsTo(Booking, {
  as: 'booking',
  foreignKey: 'bookingId',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

Booking.hasMany(PaymentSubmission, {
  as: 'paymentSubmissions',
  foreignKey: 'bookingId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
PaymentSubmission.belongsTo(Booking, {
  as: 'booking',
  foreignKey: 'bookingId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
User.hasMany(PaymentSubmission, {
  as: 'paymentSubmissions',
  foreignKey: 'userId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
PaymentSubmission.belongsTo(User, {
  as: 'user',
  foreignKey: 'userId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

Booking.hasOne(Review, {
  as: 'review',
  foreignKey: 'bookingId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Review.belongsTo(Booking, {
  as: 'booking',
  foreignKey: 'bookingId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
User.hasMany(Review, {
  as: 'submittedReviews',
  foreignKey: 'customerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Review.belongsTo(User, {
  as: 'customer',
  foreignKey: 'customerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
User.hasMany(Review, {
  as: 'receivedReviews',
  foreignKey: 'workerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Review.belongsTo(User, {
  as: 'worker',
  foreignKey: 'workerId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

module.exports = {
  sequelize,
  Sequelize,
  User,
  Skill,
  WorkerProfile,
  Booking,
  Review,
  JobOffer,
  TelebirrPayment,
  PaymentSubmission,
  SmsLog
};
