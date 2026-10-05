const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const skillsRoutes = require('./skills.routes');
const workersRoutes = require('./workers.routes');
const bookingsRoutes = require('./bookings.routes');
const reviewsRoutes = require('./reviews.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/skills', skillsRoutes);
router.use('/workers', workersRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/admin', adminRoutes);
router.use(healthRoutes);

module.exports = router;
