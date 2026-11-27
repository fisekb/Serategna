require('dotenv').config();

const { Sequelize } = require('sequelize');

const options = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false
};

const databaseName = process.env.NODE_ENV === 'test'
  ? process.env.DB_TEST_NAME || (process.env.DB_NAME && `${process.env.DB_NAME}_test`)
  : process.env.DB_NAME;

// On Render (Neon), use the connection string with SSL. Locally, use the DB_* values.
const sequelize = process.env.NODE_ENV !== 'test' && process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      ...options,
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
    })
  : new Sequelize(
      databaseName,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        ...options,
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432)
      }
    );

module.exports = sequelize;



















// require('dotenv').config();

// const { Sequelize } = require('sequelize');

// // Keep the runtime connection explicit; schema changes are managed by migrations.
// const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST || 'localhost',
//     port: Number(process.env.DB_PORT || 5432),
//     dialect: 'postgres',
//     logging: process.env.NODE_ENV === 'development' ? console.log : false
//   }
// );

// module.exports = sequelize;
