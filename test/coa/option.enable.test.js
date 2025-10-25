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
const RECT_FILE = path.resolve(PLUGINOPT_DIR, 'test-rect.svg');

const EXPECT_RECT_TO_PATH =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0H10V20H0z"/></svg>';
const EXPECT_RECT_TO_PATH_MINIFIED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0h10v20H0z"/></svg>';
const EXPECT_TRANS_PATH_NO_ID =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path transform="translate(10 20)" d="M10 20h10v20H10z"/></svg>';

describe('test --enable option', function () {
  afterAll(() => {
    fs.rmSync(tempFolder, { force: true, recursive: true });
  });

  it('should only run one plugin with --plugins and --enable=convertShapeToPath', async () => {
    await runProgram([
      '-i',
      RECT_FILE,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--pre',
      'cleanupTextNodes',
      '--plugins',
      '--enable=convertShapeToPath',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_RECT_TO_PATH);
  });

  it('should run two plugins with --plugins and --enable convertShapeToPath minifyPathData', async () => {
    await runProgram([
      '-i',
      RECT_FILE,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--plugins',
      '--enable',
      'cleanupTextNodes',
      'convertShapeToPath',
      'minifyPathData',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_RECT_TO_PATH_MINIFIED);
  });

  it('should ignore invalid plugin names', async () => {
    await runProgram([
      '-i',
      RECT_FILE,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--plugins',
      '--enable',
      'x',
      'cleanupTextNodes',
      'convertShapeToPath',
      'minifyPathData',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_RECT_TO_PATH_MINIFIED);
  });

  it('should work when plugins are specified in custom config', async () => {
    await runProgram([
      '-i',
      RECT_FILE,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--plugins',
      '--enable',
      'minifyPathData',
      '--config',
      path.resolve(PLUGINOPT_DIR, 'config1.js'),
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_RECT_TO_PATH_MINIFIED);
  });

  it('should work with default plugins', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--enable',
      'removeDimensions',
    ]);
    const opt = fs.readFileSync(path.resolve(tempFolder, 'test1.svg'), {
      encoding: 'utf8',
    });
    expect(opt).toBe(EXPECT_TRANS_PATH_NO_ID);
  });
});
