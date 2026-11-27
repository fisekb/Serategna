module.exports = (sequelize, DataTypes) => sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  workerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  amountSantim: {
    type: DataTypes.BIGINT,
    allowNull: true,
    validate: { min: 1 }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('telebirr', 'cash'),
    allowNull: true
  },
  paymentStatus: {
    type: DataTypes.ENUM('unpaid', 'verifying', 'paid', 'cash_due'),
    allowNull: false,
    defaultValue: 'unpaid'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  workerPaidOutAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'Bookings',
  timestamps: true
});
