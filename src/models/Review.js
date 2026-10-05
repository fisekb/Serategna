module.exports = (sequelize, DataTypes) => sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: 'reviews_booking_id_unique'
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  workerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5, isInt: true }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'Reviews',
  timestamps: true
});
