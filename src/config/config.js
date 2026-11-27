require('dotenv').config();

const base = { dialect: 'postgres', logging: false };

const local = {
  ...base,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432)
};

const test = {
  ...local,
  database: process.env.DB_TEST_NAME || (process.env.DB_NAME && `${process.env.DB_NAME}_test`)
};

const remote = {
  ...base,
  use_env_variable: 'DATABASE_URL',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
};

module.exports = {
  development: local,
  test,
  production: remote
};





























// require('dotenv').config();

// const databaseConfig = {
//   username: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   host: process.env.DB_HOST || 'localhost',
//   port: Number(process.env.DB_PORT || 5432),
//   dialect: 'postgres',
//   logging: false
// };

// // sequelize-cli selects the matching object based on NODE_ENV.
// module.exports = {
//   development: databaseConfig,
//   test: databaseConfig,
//   production: databaseConfig
// };
