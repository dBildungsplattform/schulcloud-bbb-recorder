const amqp = require('amqplib');

const { AMQP_URI, AMQP_QUEUE } = process.env;

function trap(signal, handler, code) {
  process.on(signal, async () => {
    try {
      await handler();
    } catch (_) {
      process.exit(code);
    }
  });
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

  // Process each individual message.
  const handle = (message) => {
    const payload = JSON.parse(message.content.toString());
    console.log(payload); // TODO: Acknowledge handled messages
  };

  // Start to consume queued messages.
  await channel.consume(AMQP_QUEUE, handle, {});
})();
