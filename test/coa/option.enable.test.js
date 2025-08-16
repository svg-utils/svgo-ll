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

const EXPECT_TRANS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="20" width="10" height="20" transform="translate(10 20)"/></svg>';
const EXPECT_TRANS_PATH =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path transform="translate(10 20)" d="M10 20h10v20H10z"/></svg>';
const EXPECT_TRANS_PATH_SORTED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 20h10v20H10z" transform="translate(10 20)"/></svg>';

describe('test --enable option', function () {
  afterAll(() => {
    fs.rmSync(tempFolder, { force: true, recursive: true });
  });

  it('should only run one plugin with --plugins and --enable=minifyTransforms', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--plugins',
      '--enable=minifyTransforms',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_TRANS);
  });

  it('should run two plugins with --plugins and --enable minifyTransforms convertShapeToPath minifyPathData', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--plugins',
      '--enable',
      'minifyTransforms',
      'convertShapeToPath',
      'minifyPathData',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_TRANS_PATH);
  });

  it('should ignore invalid plugin names', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--plugins',
      '--enable',
      'x',
      'minifyTransforms',
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
      '--plugins',
      '--enable',
      'convertShapeToPath',
      'minifyPathData',
      '--config',
      path.resolve(PLUGINOPT_DIR, 'config1.js'),
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_TRANS_PATH);
  });

  it('should work with preset-default', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--enable',
      'sortAttrs',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_TRANS_PATH_SORTED);
  });
});
