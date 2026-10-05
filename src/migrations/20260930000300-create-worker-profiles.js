'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('WorkerProfiles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      skillId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Skills', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      hourlyRate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      area: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      experienceYears: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isApproved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('WorkerProfiles', ['userId'], {
      name: 'worker_profiles_user_id_unique',
      unique: true
    });
    await queryInterface.addConstraint('WorkerProfiles', {
      fields: ['hourlyRate'],
      type: 'check',
      where: Sequelize.literal('"hourlyRate" >= 0'),
      name: 'worker_profiles_hourly_rate_nonnegative'
    });
    await queryInterface.addConstraint('WorkerProfiles', {
      fields: ['experienceYears'],
      type: 'check',
      where: Sequelize.literal('"experienceYears" >= 0'),
      name: 'worker_profiles_experience_years_nonnegative'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('WorkerProfiles');
  }
};
