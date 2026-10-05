module.exports = (sequelize, DataTypes) => sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
    validate: { notEmpty: true }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: 'users_email_unique',
    validate: { isEmail: true, notEmpty: true }
  },
  phone: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('customer', 'worker', 'admin'),
    allowNull: false,
    defaultValue: 'customer'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'Users',
  timestamps: true
});
