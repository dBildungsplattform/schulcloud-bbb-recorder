const fs = require('fs');
const { Readable, Writable } = require('stream');

const got = require('got');

const upload = require('./upload');

jest.mock('fs');
jest.mock('got', () => ({ stream: { post: jest.fn() } }));

// Create a writable stream that captures all written chunks.
// https://nodejs.org/docs/latest-v12.x/api/stream.html#stream_implementing_a_writable_stream
class MockWriteStream extends Writable {
  constructor(options) {
    super(options);
    this.chunks = [];
  }

  // eslint-disable-next-line no-underscore-dangle
  _write(chunk, encoding, callback) {
    this.chunks.push(chunk);
    callback(null);
  }

  get received() {
    return Buffer.concat(this.chunks).toString();
  }
}

describe('upload', () => {
  beforeEach(() => {
    fs.createReadStream.mockImplementation((path) => Readable.from(path));
    got.stream.post.mockImplementation(() => new MockWriteStream());
  });

  afterEach(() => {
    fs.createReadStream.mockReset();
    got.stream.post.mockReset();
  });

  it('streams the video file to the upload URL', async () => {
    const filepath = '/tmp/test.webm';
    const url = 'https://localhost/…';

    await upload(filepath, url, '…');

    expect(fs.createReadStream).toHaveBeenCalledWith(filepath);
    expect(got.stream.post).toHaveBeenCalledWith(url, expect.any(Object));
    const [{ value: request }] = got.stream.post.mock.results;
    expect(request.received).toBe(filepath);
  });

  it.todo('sets the authorization header with a signed value');
});
