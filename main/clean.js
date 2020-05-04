const { promises: fs } = require('fs');

async function clean(filepath) {
  await fs.unlink(filepath);
}

module.exports = clean;
