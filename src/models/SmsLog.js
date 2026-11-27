module.exports = (sequelize, DataTypes) => sequelize.define('SmsLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  parsed: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  receivedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'SmsLogs',
  timestamps: true
});
