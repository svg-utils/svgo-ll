import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { fileURLToPath } from 'url';
import svgo, { checkIsDir } from '../../lib/svgo/coa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgFolderPath = path.resolve(__dirname, 'testSvg');
const svgFolderPathRecursively = path.resolve(__dirname, 'testSvgRecursively');
const svgFiles = [
  path.resolve(__dirname, 'testSvg/test.svg'),
  path.resolve(__dirname, 'testSvg/test.1.svg'),
];
const tempFolder = 'temp';
const noop = () => {};

/**
 * @param {string[]} args
 */
function runProgram(args) {
  const program = new Command();
  svgo(program);
  // prevent running process.exit
  program.exitOverride(() => {});
  // parser skips first two arguments
  return program.parseAsync(['0', '1', ...args]);
}

describe('coa', function () {
  beforeEach(async () => {
    await fs.promises.rm(tempFolder, { force: true, recursive: true });
    await fs.promises.mkdir(tempFolder);
  });

  afterAll(async () => {
    await fs.promises.rm(tempFolder, { force: true, recursive: true });
  });

  const initialConsoleError = global.console.error;
  const initialProcessExit = global.process.exit;

  function replaceConsoleError() {
    // @ts-ignore
    global.process.exit = noop;
  }

  function restoreConsoleError() {
    global.console.error = initialConsoleError;
    global.process.exit = initialProcessExit;
  }

  /**
   * @param {string} folderPath
   * @returns {number}
   */
  function calcFolderSvgWeight(folderPath) {
    return fs
      .readdirSync(folderPath)
      .reduce(
        (initWeight, name) =>
          initWeight +
          (/.svg/.test(name)
            ? fs.statSync(path.join(folderPath, name)).size
            : 0) +
          (checkIsDir(path.join(folderPath, name))
            ? calcFolderSvgWeight(path.join(folderPath, name))
            : 0),
        0,
      );
  }

  it('should optimize folder', async () => {
    const initWeight = calcFolderSvgWeight(svgFolderPath);
    await runProgram([
      '--folder',
      svgFolderPath,
      '--output',
      tempFolder,
      '--quiet',
    ]);
    const optimizedWeight = calcFolderSvgWeight(svgFolderPath);
    expect(optimizedWeight).toBeGreaterThan(0);
    expect(initWeight).toBeLessThanOrEqual(optimizedWeight);
  });

  it('should optimize folder recursively', async () => {
    const initWeight = calcFolderSvgWeight(svgFolderPathRecursively);
    await runProgram([
      '--folder',
      svgFolderPathRecursively,
      '--output',
      tempFolder,
      '--quiet',
      '--recursive',
    ]);
    const optimizedWeight = calcFolderSvgWeight(svgFolderPathRecursively);
    expect(optimizedWeight).toBeGreaterThan(0);
    expect(initWeight).toBeLessThanOrEqual(optimizedWeight);
  });

  it('should optimize several files', async () => {
    const initWeight = calcFolderSvgWeight(svgFolderPath);
    await runProgram([
      '--input',
      ...svgFiles,
      '--output',
      tempFolder,
      '--quiet',
    ]);
    const optimizedWeight = calcFolderSvgWeight(tempFolder);
    expect(optimizedWeight).toBeGreaterThan(0);
    expect(optimizedWeight).toBeLessThanOrEqual(initWeight);
    await fs.promises.rm('temp.svg', { force: true });
  });

  it('should generate correct datauri', async () => {
    const outfilePath = tempFolder + '/test.svg';
    await runProgram([
      '-i',
      path.resolve(__dirname, 'testSvgDatauri') + '/test.svg',
      '-o',
      outfilePath,
      '--datauri',
      'enc',
      '--quiet',
    ]);
    const outData = fs.readFileSync(outfilePath, 'utf8');
    expect(outData).toBe(
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctext%20x%3D%225%22%20y%3D%2215%22%3ETEST%3C%2Ftext%3E%3C%2Fsvg%3E',
    );
  });

  // TODO: This doesn't work - it is overwriting all input files and ignoring --output. Should treat --input <folder>
  //    like --folder <folder>.
  // it('should optimize folder, when it stated in input', async () => {
  //   const initWeight = calcFolderSvgWeight(svgFolderPath);
  //   await runProgram([
  //     '--input',
  //     svgFolderPath,
  //     '--output',
  //     tempFolder,
  //     '--quiet',
  //   ]);
  //   let optimizedWeight = calcFolderSvgWeight(svgFolderPath);
  //   expect(optimizedWeight).toBeLessThanOrEqual(initWeight);
  // });

  it('should throw error when stated input folder does not exist', async () => {
    replaceConsoleError();
    try {
      await expect(
        runProgram(['--input', svgFolderPath + 'temp', '--output', tempFolder]),
      ).rejects.toThrow(/no such file or directory/);
    } finally {
      restoreConsoleError();
    }
  });

  describe('stdout', () => {
    it('should show message when the folder is empty', async () => {
      const emptyFolderPath = path.resolve(__dirname, 'testSvgEmpty');
      if (!fs.existsSync(emptyFolderPath)) {
        fs.mkdirSync(emptyFolderPath);
      }
      await expect(
        runProgram(['--folder', emptyFolderPath, '--quiet']),
      ).rejects.toThrow(/No SVG files/);
    });

    it('should show message when folder does not consists any svg files', async () => {
      await expect(
        runProgram([
          '--folder',
          path.resolve(__dirname, 'testFolderWithNoSvg'),
          '--quiet',
        ]),
      ).rejects.toThrow(/No SVG files have been found/);
    });
  });
});

const PLUGINOPT_DIR = path.resolve(__dirname, 'testPluginOpts');
const PLUGINOPT_FILE1 = path.resolve(PLUGINOPT_DIR, 'test1.svg');
const PLUGINOPT_FILE1_OPT = path.resolve(tempFolder, 'test1.svg');

const EXPECT_TRANS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="20" width="10" height="20" transform="translate(10 20)"/></svg>';
const EXPECT_TRANS_PATH =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path transform="translate(10 20)" d="M10 20h10v20H10z"/></svg>';
const EXPECT_TRANS_PATH_SORTED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 20h10v20H10z" transform="translate(10 20)"/></svg>';

describe('test preset option', function () {
  afterAll(() => {
    fs.rmSync(tempFolder, { force: true, recursive: true });
  });

  it('should use default preset when option not specified', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_TRANS_PATH);
  });

  it('should only remove whitespace when "none" specified', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--preset',
      'none',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="20" width="10" height="20" transform="matrix(1 0 0 1 10 20) "/></svg>',
    );
  });

  it('should only minify transform when "none" specified, but custom config is used', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--preset',
      'none',
      '--config',
      path.resolve(PLUGINOPT_DIR, 'config1.js'),
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_TRANS);
  });
});

describe('test --enable option', function () {
  afterAll(() => {
    fs.rmSync(tempFolder, { force: true, recursive: true });
  });

  it('should only run one plugin with --preset=none and --enable=minifyTransforms', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--preset=none',
      '--enable=minifyTransforms',
    ]);
    const opt = fs.readFileSync(PLUGINOPT_FILE1_OPT, { encoding: 'utf8' });
    expect(opt).toBe(EXPECT_TRANS);
  });

  it('should run two plugins with --preset=none and --enable minifyTransforms convertShapeToPath minifyPathData', async () => {
    await runProgram([
      '-i',
      PLUGINOPT_FILE1,
      '-o',
      PLUGINOPT_FILE1_OPT,
      '--quiet',
      '--preset=none',
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
      '--preset=none',
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
      '--preset=none',
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
