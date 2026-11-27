module.exports = (sequelize, DataTypes) => sequelize.define('TelebirrPayment', {
  txId: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false
  },
  amountSantim: {
    type: DataTypes.BIGINT,
    allowNull: false,
    validate: { min: 1 }
  },
  payerName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  payerLast4: {
    type: DataTypes.STRING(4),
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: 'telebirr_payments_booking_id_unique'
  }
}, {
  tableName: 'TelebirrPayments',
  timestamps: true
});
