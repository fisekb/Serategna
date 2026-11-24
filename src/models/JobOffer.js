module.exports = (sequelize, DataTypes) => sequelize.define('JobOffer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  acceptedWorkerId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  skillId: {
    type: DataTypes.INTEGER,
    allowNull: false
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
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'JobOffers',
  timestamps: true
});
