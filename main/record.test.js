const childproc = require('child_process');
const path = require('path');

const record = require('./record');
const bbbconf = require('../bbb-recorder/config.json');

jest.mock('child_process');
jest.mock('util', () => ({ promisify: (fn) => fn }));

const { exec } = childproc;

describe('record', () => {
  beforeEach(() => {
    exec.mockResolvedValue({ stderr: '…', stdout: '…' });
  });

  afterEach(() => {
    exec.mockReset();
  });

  it('invokes the bbb-recorder export', async () => {
    await record('https://localhost/bbb/playback.html?…', 63);
    const command = `node export.js 'https://localhost/bbb/playback.html?…' 'export.webm' '63'`;
    const options = { cwd: path.resolve(__dirname, '..', 'bbb-recorder') };
    expect(exec).toHaveBeenCalledWith(command, options);
  });

  it('returns the video file path', async () => {
    const result = await record('https://…', 64);
    const directory = path.resolve(bbbconf.copyToPath);
    const filepath = path.join(directory, 'export.webm');
    expect(result).toBe(filepath);
  });
});
