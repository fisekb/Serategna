const { Skill } = require('../models');

async function listSkills() {
  return Skill.findAll({
    attributes: ['id', 'name'],
    order: [['name', 'ASC']]
  });
}

module.exports = { listSkills };
