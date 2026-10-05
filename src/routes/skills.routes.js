const express = require('express');
const { listSkills } = require('../controllers/skills.controller');

const router = express.Router();

router.get('/', listSkills);

module.exports = router;
