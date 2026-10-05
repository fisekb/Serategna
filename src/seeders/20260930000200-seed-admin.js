'use strict';

require('dotenv').config();

const bcrypt = require('bcrypt');

const adminEmail = (process.env.ADMIN_EMAIL || 'admin@serategna.local').trim().toLowerCase();
const adminName = process.env.ADMIN_NAME || 'Serategna Admin';

module.exports = {
  async up(queryInterface) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      throw new Error('ADMIN_PASSWORD must be set in the environment before running seeders.');
    }

    const [existingUsers] = await queryInterface.sequelize.query(
      'SELECT "id", "role" FROM "Users" WHERE "email" = :email LIMIT 1',
      { replacements: { email: adminEmail } }
    );
    if (existingUsers[0]?.role === 'admin') {
      return;
    }
    if (existingUsers.length > 0) {
      throw new Error('ADMIN_EMAIL belongs to a non-admin user; configure a different ADMIN_EMAIL.');
    }

    const now = new Date();
    await queryInterface.bulkInsert('Users', [{
      name: adminName,
      email: adminEmail,
      phone: null,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'admin',
      isActive: true,
      createdAt: now,
      updatedAt: now
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', { email: adminEmail, role: 'admin' });
  }
};
