'use strict';

const skills = [
  'plumber',
  'electrician',
  'carpenter',
  'daily laborer',
  'domestic worker'
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('Skills', skills.map((name) => ({
      name,
      createdAt: now,
      updatedAt: now
    })));
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Skills', { name: skills });
  }
};
