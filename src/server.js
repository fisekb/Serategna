require('dotenv').config();

const app = require('./app');
const sequelize = require('./config/database');

const port = Number(process.env.PORT || 3000);

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    const server = app.listen(port, () => {
      console.log(`Serategna API listening on port ${port}.`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received; shutting down gracefully.`);
      server.close(async () => {
        await sequelize.close();
        process.exit(0);
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
}

startServer();
