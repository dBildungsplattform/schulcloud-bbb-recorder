const amqp = require('amqplib');

const { AMQP_URI, AMQP_QUEUE } = process.env;

function handler(message) {
  const payload = JSON.parse(message.content.toString());
  console.log(payload);
}

(async function main() {
  // Connect to the queue
  const connection = await amqp.connect(AMQP_URI);
  const channel = await connection.createChannel();

  // Ensure the queue is created
  await channel.assertQueue(AMQP_QUEUE, { durable: true });

  // Receive messages from the queue
  await channel.consume(AMQP_QUEUE, handler, {});
})();
