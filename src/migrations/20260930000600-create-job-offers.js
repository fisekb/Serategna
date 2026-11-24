'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('JobOffers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      customerId: {
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
      description: {
        type: Sequelize.TEXT,
        allowNull: false
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

    await queryInterface.addIndex('JobOffers', ['customerId', 'createdAt'], {
      name: 'job_offers_customer_created_at'
    });
    await queryInterface.addConstraint('JobOffers', {
      fields: ['hourlyRate'],
      type: 'check',
      where: Sequelize.literal('"hourlyRate" >= 0'),
      name: 'job_offers_hourly_rate_nonnegative'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('JobOffers');
  }
};
