const childproc = require('child_process');
const path = require('path');
const util = require('util');

const bbbconf = require('../bbb-recorder/config.json');

const RECORD_CWD = path.resolve(__dirname, '..', 'bbb-recorder');
const RECORD_DIRECTORY = path.resolve(bbbconf.copyToPath);
const RECORD_FILENAME = 'export.webm';

const exec = util.promisify(childproc.exec);

async function record(url, duration) {
  await exec(`node export.js '${url}' '${RECORD_FILENAME}' '${duration}'`, {
    cwd: RECORD_CWD,
  });

  return path.join(RECORD_DIRECTORY, RECORD_FILENAME);
}

module.exports = record;
