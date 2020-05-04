const amqp = require('amqplib');

const main = require('.');
const record = require('./record');

jest.mock('amqplib');
jest.mock('./record');
jest.mock('./upload');
jest.mock('./clean');

const processExit = process.exit;
const processOn = process.on;

function setupProcess() {
  process.exit = jest.fn();
  process.on = jest.fn();
}

function restoreProcess() {
  process.exit = processExit;
  process.on = processOn;
}

function mock(keys, makeFn = () => jest.fn().mockResolvedValue()) {
  return keys.reduce((object, key) => {
    // eslint-disable-next-line no-param-reassign
    object[key] = makeFn(key, object);
    return object;
  }, {});
}

describe('main', () => {
  async function invoke(overrides) {
    return main({
      AMQP_URI: 'amqp://localhost.test',
      AMQP_QUEUE: 'test-queue',
      ...overrides,
    });
  }

  let connection;
  let channel;

  beforeEach(() => {
    channel = mock('ack assertQueue close consume nack prefetch'.split(' '));
    connection = mock('close createChannel'.split(' '));

    connection.createChannel.mockResolvedValue(channel);

    amqp.connect.mockResolvedValue(connection);

    setupProcess();
  });

  afterEach(() => {
    amqp.connect.mockReset();
    record.mockReset();
    restoreProcess();
  });

  describe('setup', () => {
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
  });

  describe('message handler', () => {
    async function handle(message) {
      await invoke({}); // invoke "main" to perform setup
      const [[, handler]] = channel.consume.mock.calls;
      return handler(message);
    }

    function marshal(payload) {
      return Buffer.from(JSON.stringify(payload));
    }

    it('creates a video for each message', async () => {
      const url = 'https://localhost/playback/123456';
      const duration = 59;
      await handle({ content: marshal({ url, duration }) });
      expect(record).toHaveBeenCalledWith(url, duration);
    });

    it.todo('uploads the created videos');

    it.todo('cleans up after a video is uploaded');

    it('acknowledges messages on success', async () => {
      const payload = marshal({ url: 'https://…', duration: 12 });
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
  });

  describe('signal handling', () => {
    async function shutdown(signal) {
      const [, handler] = process.on.mock.calls.find(
        ([name]) => name === signal
      );

      await handler();
    }

    beforeEach(async () => {
      await invoke({});
    });

    [
      ['SIGINT', 130],
      ['SIGQUIT', 131],
      ['SIGTERM', 143],
    ].forEach(([signal, code]) => {
      it(`sets up a trap for ${signal}`, async () => {
        expect(process.on).toHaveBeenCalledWith(signal, expect.any(Function));
      });

      it(`cleans up and exits normally on ${signal}`, async () => {
        await shutdown(signal);

        expect(channel.close).toHaveBeenCalled();
        expect(connection.close).toHaveBeenCalled();
        expect(process.exit).not.toHaveBeenCalled();
      });

      it(`exits with ${code} if cleanup fails on ${signal}`, async () => {
        channel.close.mockRejectedValue();

        await shutdown(signal);

        expect(process.exit).toHaveBeenCalledWith(code);
      });
    });
  });
});
