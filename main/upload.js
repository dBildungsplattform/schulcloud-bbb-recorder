const fs = require('fs');
const stream = require('stream');
const util = require('util');

const got = require('got');
const jwt = require('jsonwebtoken');

const pipeline = util.promisify(stream.pipeline);
const jwtSign = util.promisify(jwt.sign);

async function upload(filepath, url, secret) {
  const token = await jwtSign(url, secret);
  const headers = { authorization: `Bearer ${token}` };

  const source = fs.createReadStream(filepath);
  const destination = got.stream.post(url, { headers });

  await pipeline(source, destination);
}

module.exports = upload;
