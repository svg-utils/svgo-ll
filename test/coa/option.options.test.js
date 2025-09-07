import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import svgo from '../../lib/svgo/coa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Add a random number to avoid collisions with other tests.
const tempFolder = 'temp' + Math.random();

/**
 * @param {string[]} args
 */
function runProgram(args) {
  const program = svgo();
  // prevent running process.exit
  program.exitOverride(() => {});
  // parser skips first two arguments
  return program.parseAsync(['0', '1', ...args]);
}

const PLUGINOPT_DIR = path.resolve(__dirname, 'testPluginOpts');
const PLUGINOPT_FILE1 = path.resolve(PLUGINOPT_DIR, 'test1.svg');
const PLUGINOPT_FILE1_OPT = path.resolve(tempFolder, 'test1.svg');

const EXPECT_ID_PRESERVED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path id="abc" transform="translate(10 20)" d="M10 20h10v20H10z"/></svg>';

describe('test --options option', function () {
  afterAll(() => {
    fs.rmSync(tempFolder, { force: true, recursive: true });
  });

  it('should handle --options option', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--options',
      path.resolve(PLUGINOPT_DIR, 'options.minifyIds.json'),
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_ID_PRESERVED);
  });
});
