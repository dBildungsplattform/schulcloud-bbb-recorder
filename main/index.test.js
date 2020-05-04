const amqp = require('amqplib');

const main = require('.');
const record = require('./record');

jest.mock('amqplib');
jest.mock('./record');

function mock(keys, makeFn = () => jest.fn().mockResolvedValue()) {
  return keys.reduce((object, key) => {
    // eslint-disable-next-line no-param-reassign
    object[key] = makeFn(key, object);
    return object;
  }, {});
}

describe('main', () => {
  async function invoke(overrides) {
    const defaults = {
      AMQP_URI: 'amqp://localhost.test',
      AMQP_QUEUE: 'test-queue',
    };

    return main({ ...defaults, ...overrides });
  }

  let connection;
  let channel;

  async function handle(message) {
    await invoke({}); // invoke "main" to perform setup
    const [[, handler]] = channel.consume.mock.calls;
    return handler(message);
  }

  function marshal(payload) {
    return Buffer.from(JSON.stringify(payload));
  }

  beforeEach(() => {
    channel = mock('ack assertQueue close consume nack prefetch'.split(' '));
    connection = mock('close createChannel'.split(' '));

    connection.createChannel.mockResolvedValue(channel);

    amqp.connect.mockResolvedValue(connection);
  });

  afterEach(() => {
    amqp.connect.mockReset();
    record.mockReset();
  });

  it('connects to the message broker', async () => {
    const AMQP_URI = 'amqp://unit:test@localhost:5672';
    await invoke({ AMQP_URI });
    expect(amqp.connect).toHaveBeenCalledWith(AMQP_URI);
  });

  it('creates a channel', async () => {
    await invoke({});
    expect(connection.createChannel).toHaveBeenCalled();
  });

  it('asserts the queue into existence', async () => {
    const AMQP_QUEUE = 'test-queue-name:assertQueue';
    await invoke({ AMQP_QUEUE });
    expect(channel.assertQueue).toHaveBeenCalledWith(AMQP_QUEUE, {
      durable: true,
    });
  });

  it('sets the prefetch count to 1', async () => {
    await invoke({});
    expect(channel.prefetch).toHaveBeenCalledWith(1);
  });

  it('sets up a handler for queued messages', async () => {
    const AMQP_QUEUE = 'test-queue-name:consume';
    await invoke({ AMQP_QUEUE });
    expect(channel.consume).toHaveBeenCalledWith(
      AMQP_QUEUE,
      expect.any(Function),
      {}
    );
  });

  it('creates a video for each message', async () => {
    const url = 'https://localhost/playback/123456';
    const duration = 59;
    await handle({ content: marshal({ url, duration }) });
    expect(record).toHaveBeenCalledWith(url, duration);
  });

  it('acknowledges messages on success', async () => {
    const payload = marshal({ url: '', duration: 12 });
    const message = { id: 'test-success', content: marshal(payload) };
    await handle(message);
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('rejects messages on failure', async () => {
    record.mockRejectedValue(new Error('Test Error'));
    const message = { id: 'test-failure' };
    await handle(message);
    expect(channel.nack).toHaveBeenCalledWith(message);
  });

  [
    ['SIGINT', 130],
    ['SIGQUIT', 131],
    ['SIGTERM', 143],
  ].forEach(([signal, code]) => {
    it.todo(`sets up a trap for ${signal}`);

    it.todo(`cleans up and exits with 0 on ${signal}`);

    it.todo(`exits with ${code} `);
  });
});
