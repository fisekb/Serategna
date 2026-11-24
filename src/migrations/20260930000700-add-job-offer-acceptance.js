'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('JobOffers', 'acceptedWorkerId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    await queryInterface.addColumn('JobOffers', 'acceptedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('JobOffers', 'acceptedAt');
    await queryInterface.removeColumn('JobOffers', 'acceptedWorkerId');
  }
};
