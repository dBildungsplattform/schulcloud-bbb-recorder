const { promises: fs } = require('fs');

const clean = require('./clean');

jest.mock('fs', () => ({ promises: { unlink: jest.fn() } }));

describe('clean', () => {
  it('removes the given file', async () => {
    const filepath = '/tmp/unit-test.webm';
    await clean(filepath);
    expect(fs.unlink).toHaveBeenCalledWith(filepath);
  });
});
