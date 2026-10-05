module.exports = (sequelize, DataTypes) => sequelize.define('WorkerProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: 'worker_profiles_user_id_unique'
  },
  skillId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  city: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  area: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  experienceYears: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, isInt: true }
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'WorkerProfiles',
  timestamps: true
});
