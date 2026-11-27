module.exports = (sequelize, DataTypes) => sequelize.define('PaymentSubmission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  txId: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  }
}, {
  tableName: 'PaymentSubmissions',
  timestamps: true,
  indexes: [
    { fields: ['txId', 'status'] },
    { unique: true, fields: ['bookingId', 'txId'], name: 'payment_submissions_booking_tx_unique' }
  ]
});
