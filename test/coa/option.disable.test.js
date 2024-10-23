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

const EXPECT_NO_CHANGE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="20" width="10" height="20" transform="matrix(1 0 0 1 10 20) "/></svg>';
const EXPECT_TRANS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="20" width="10" height="20" transform="translate(10 20)"/></svg>';

describe('test --disable option', function () {
  afterAll(() => {
    fs.rmSync(tempFolder, { force: true, recursive: true });
  });

  it('should not run convertShapeToPath with --preset=default and --disable=convertShapeToPath', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--disable=convertShapeToPath',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_TRANS);
  });

  it('should run multiple plugins with --preset=default and --disable minifyTransforms convertShapeToPath minifyColors', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--disable',
      'minifyTransforms',
      'convertShapeToPath',
      'minifyColors',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_NO_CHANGE);
  });

  it('should ignore invalid plugin names', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--disable',
      'x',
      'convertShapeToPath',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_TRANS);
  });

  it('should work when plugins are specified in custom config', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--disable',
      'minifyTransforms',
      '--config',
      path.resolve(PLUGINOPT_DIR, 'config1.js'),
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_NO_CHANGE);
  });
});
