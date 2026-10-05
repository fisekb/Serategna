const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const apiRoutes = require('./routes');
const { apiRateLimiter, authRateLimiter } = require('./middleware/rateLimiter');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Parse request bodies before route validation, and limit abuse before handling API work.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/api/auth', authRateLimiter);
app.use('/api', apiRateLimiter);
app.use('/api', apiRoutes);

// Serve the static HTML/CSS/JS frontend after API routes and before the 404 handler.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Keep 404 handling before the final Express error handler.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
