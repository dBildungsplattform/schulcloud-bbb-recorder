const childproc = require('child_process');
const amqp = require('amqplib');
const path = require('path');
const util = require('util');

const bbbconf = require('./bbb-recorder/config.json');

const RECORD_CWD = path.resolve(__dirname, 'bbb-recorder');
const RECORD_DIRECTORY = path.resolve(bbbconf.copyToPath);
const RECORD_FILENAME = 'export.webm';

const { AMQP_URI, AMQP_QUEUE } = process.env;

const exec = util.promisify(childproc.exec);

function trap(signal, handler, code) {
  process.on(signal, async () => {
    try {
      await handler();
    } catch (_) {
      process.exit(code);
    }
  });
}

async function record(url, duration) {
  // TODO: assert `duration` is an integer
  // TODO: assert `url` is a valid HTTP(S) URL

  await exec(`node export.js '${url}' '${RECORD_FILENAME}' '${duration}'`, {
    cwd: RECORD_CWD,
  });

  return path.join(RECORD_DIRECTORY, RECORD_FILENAME);
}

(async function main() {
  // Connect to the queue.
  const connection = await amqp.connect(AMQP_URI);
  const channel = await connection.createChannel();

  // Gracefully handle signals and initiate an orderly shutdown.
  // Exit with a signal-specific non-zero code if cleanup fails.
  // https://nodejs.org/api/process.html#process_exit_codes

  const shutdown = async () => {
    await channel.close();
    await connection.close();
  };

  trap('SIGINT',  shutdown, 128 + 2); // eslint-disable-line prettier/prettier
  trap('SIGQUIT', shutdown, 128 + 3);
  trap('SIGTERM', shutdown, 128 + 15);

  // Ensure the queue is created.
  await channel.assertQueue(AMQP_QUEUE, { durable: true });

  // Limit how many messages are processed concurrently
  await channel.prefetch(1);

  // Process each individual message.
  const handle = async (message) => {
    const payload = JSON.parse(message.content.toString());

    const filepath = await record(payload.url, payload.duration);
    console.debug(filepath);

    // TODO: upload
    // TODO: clean-up?

    // TODO: Acknowledge handled messages
  };

  // Start to consume queued messages.
  await channel.consume(AMQP_QUEUE, handle, {});
})();
