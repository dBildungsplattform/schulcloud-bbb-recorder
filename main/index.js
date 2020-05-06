const amqp = require('amqplib');

const record = require('./record');
const upload = require('./upload');
const clean = require('./clean');

function trap(signal, handler, code) {
  process.on(signal, async () => {
    try {
      await handler();
    } catch (_) {
      process.exit(code);
    }
  });
}

async function main({ AMQP_URI, AMQP_QUEUE, UPLOAD_URI, UPLOAD_SECRET }) {
  // Connect to the message broker.
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
    try {
      const { duration, url, vid } = JSON.parse(message.content.toString());

      const filepath = await record(url, duration);

      const endpoint = UPLOAD_URI.replace(':vid', vid);
      await upload(filepath, endpoint, UPLOAD_SECRET);
      await clean(filepath);

      await channel.ack(message);
    } catch (_) {
      // TODO: Log error for observability?
      await channel.nack(message);
    }
  };

  // Start to consume queued messages.
  await channel.consume(AMQP_QUEUE, handle, {});
}

module.exports = main;
