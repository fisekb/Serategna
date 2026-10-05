module.exports = (sequelize, DataTypes) => sequelize.define('Skill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: 'skills_name_unique',
    validate: { notEmpty: true }
  }
}, {
  tableName: 'Skills',
  timestamps: true
});
