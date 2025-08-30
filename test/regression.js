import { cwd } from 'node:process';
import fs from 'node:fs';
import path from 'path';
import { program } from 'commander';
import * as playwright from 'playwright';
import { optimize } from '../lib/svgo.js';
import { toFixed } from '../lib/svgo/tools.js';
import { readJSONFile } from '../lib/svgo/tools-node.js';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import Pixelmatch from 'pixelmatch';
import { cpus } from 'node:os';

/**
 * @typedef {{
 * plugins?:string[],enable?:string[],disable?:string[],options?:string,inputdir:string,log:boolean,
 * browser:'chromium' | 'firefox' | 'webkit',
 * workers?:string
 * }} CmdLineOptions
 * @typedef {Map<string,{lengthOrig?:number,lengthOpt?:number,passes?:number,time?:number,pixels?:number}>} StatisticsMap
 */

const BROWSER_WIDTH = 960;
const BROWSER_HEIGHT = 720;

/** @type {import('playwright').PageScreenshotOptions} */
const screenshotOptions = {
  omitBackground: true,
  clip: { x: 0, y: 0, width: BROWSER_WIDTH, height: BROWSER_HEIGHT },
  animations: 'disabled',
};

/**
 * @param {CmdLineOptions} options
 */
async function performRegression(options) {
  const inputDir = path.join(cwd(), options.inputdir);
  const outputDir = path.join(cwd(), './ignored/regression/output-files');
  fs.rmSync(outputDir, { force: true, recursive: true });

  const inputDirEntries = fs.readdirSync(inputDir, {
    recursive: true,
    encoding: 'utf8',
  });
  const relativeFilePaths = inputDirEntries
    .filter((name) => name.endsWith('.svg'))
    .map((name) => name.replaceAll('\\', '/'));

  const numWorkers = options.workers
    ? parseInt(options.workers)
    : cpus().length * 2;

  // Initialize statistics array.
  /** @type {StatisticsMap} */
  const stats = new Map();

  relativeFilePaths.forEach((name) => stats.set(name, {}));

  const start = Date.now();

  await optimizeFiles(
    inputDir,
    outputDir,
    relativeFilePaths,
    options,
    stats,
    numWorkers,
  );
  const optPhaseTime = Date.now() - start;

  const compStart = Date.now();
  await compareOutput(
    inputDir,
    outputDir,
    relativeFilePaths,
    options,
    stats,
    numWorkers,
  );

  showStats(
    stats,
    Date.now() - start,
    optPhaseTime,
    Date.now() - compStart,
    numWorkers,
  );

  if (options.log) {
    writeLog(stats);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string} inputRootDir
 * @param {string} outputRootDir
 * @param {string} diffRootDir
 * @param {string} relativeFilePath
 * @param {StatisticsMap} statsMap
 */
async function compareFile(
  page,
  inputRootDir,
  outputRootDir,
  diffRootDir,
  relativeFilePath,
  statsMap,
) {
  const stats = getStats(statsMap, relativeFilePath);
  if (stats.lengthOpt === undefined) {
    // File was not optimized, don't compare.
    return;
  }

  const input = await getScreenShot(page, inputRootDir, relativeFilePath);
  const output = await getScreenShot(page, outputRootDir, relativeFilePath);

  const diff = new PNG({ width: BROWSER_WIDTH, height: BROWSER_HEIGHT });
  const mismatchCount = Pixelmatch(
    input.data,
    output.data,
    diff.data,
    BROWSER_WIDTH,
    BROWSER_HEIGHT,
  );

  stats.pixels = mismatchCount;

  if (mismatchCount > 0) {
    // Write the diff image.
    const filePath = path.join(diffRootDir, relativeFilePath) + '.png';
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, PNG.sync.write(diff));
  }
}

/**
 * @param {string} inputDir
 * @param {string} outputDir
 * @param {string[]} relativeFilePathsIn
 * @param {CmdLineOptions} options
 * @param {StatisticsMap} statsMap
 * @param {number} numWorkers
 */
async function compareOutput(
  inputDir,
  outputDir,
  relativeFilePathsIn,
  options,
  statsMap,
  numWorkers,
) {
  /** @type {'chromium' | 'firefox' | 'webkit'} */
  const browserStr = ['chromium', 'firefox', 'webkit'].includes(options.browser)
    ? options.browser
    : // Default to webkit since that shows fewer false positives.
      'webkit';
  const browserType = playwright[browserStr];

  const browser = await browserType.launch();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: BROWSER_WIDTH, height: BROWSER_HEIGHT },
  });

  const diffRootDir = path.join(cwd(), './ignored/regression/diffs');
  fs.rmSync(diffRootDir, { force: true, recursive: true });

  const relativeFilePaths = relativeFilePathsIn.slice();

  const worker = async () => {
    let filePath;
    const page = await context.newPage();
    while ((filePath = relativeFilePaths.pop())) {
      await compareFile(
        page,
        inputDir,
        outputDir,
        diffRootDir,
        filePath,
        statsMap,
      );
    }
    await page.close();
  };

  await Promise.all(Array.from(new Array(numWorkers), () => worker()));

  await browser.close();
}

/**
 *
 * @param {import('playwright').Page} page
 * @param {string} rootDir
 * @param {string} relativeFilePath
 * @returns {Promise<import('pngjs').PNGWithMetadata>}
 */
async function getScreenShot(page, rootDir, relativeFilePath) {
  const url = pathToFileURL(path.join(rootDir, relativeFilePath));
  await page.goto(url.toString());
  const buffer = await page.screenshot(screenshotOptions);
  return PNG.sync.read(buffer);
}

/**
 * @param {StatisticsMap} statsMap
 * @param {string} relativeFilePath
 */
function getStats(statsMap, relativeFilePath) {
  const stats = statsMap.get(relativeFilePath);
  if (!stats) {
    throw new Error(`no statistics for ${relativeFilePath}`);
  }
  return stats;
}

/**
 * @param {string} inputDir
 * @param {string} outputDir
 * @param {string[]} relativeFilePathsIn
 * @param {CmdLineOptions} options
 * @param {StatisticsMap} statsMap
 * @param {number} numWorkers
 */
async function optimizeFiles(
  inputDir,
  outputDir,
  relativeFilePathsIn,
  options,
  statsMap,
  numWorkers,
) {
  /** @type {import('../lib/svgo.js').Config} */
  const config = {
    pluginNames: options.plugins,
    enable: options.enable,
    options: options.options ? readJSONFile(options.options) : undefined,
    disable: options.disable,
  };

  const relativeFilePaths = relativeFilePathsIn.slice();

  const worker = async () => {
    let filePath;
    while ((filePath = relativeFilePaths.pop())) {
      await optimizeFile(inputDir, outputDir, filePath, config, statsMap);
    }
  };

  await Promise.all(Array.from(new Array(numWorkers), () => worker()));
}

/**
 * @param {string} inputDirRoot
 * @param {string} outputDirRoot
 * @param {string} relativePath
 * @param {import('../lib/svgo.js').Config} config
 * @param {StatisticsMap} statsMap
 */
async function optimizeFile(
  inputDirRoot,
  outputDirRoot,
  relativePath,
  config,
  statsMap,
) {
  const inputPath = path.join(inputDirRoot, relativePath);
  const input = fs.readFileSync(inputPath, 'utf8');

  const stats = getStats(statsMap, relativePath);
  if (!stats) {
    throw new Error(`no statistics for ${relativePath}`);
  }
  stats.lengthOrig = input.length;

  const optimizedData = optimize(input, config);
  if (!optimizedData.error) {
    stats.lengthOpt = optimizedData.data.length;
    stats.passes = optimizedData.passes;
    stats.time = optimizedData.time;
  }

  const outputPath = path.join(outputDirRoot, relativePath);
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, optimizedData.data);
}

/**
 * @param {StatisticsMap} stats
 * @param {number} totalTime
 * @param {number} optPhaseTime
 * @param {number} compPhaseTime
 * @param {number} numWorkers
 */
function showStats(stats, totalTime, optPhaseTime, compPhaseTime, numWorkers) {
  const statsArray = Array.from(stats.values());

  const mismatched = statsArray.reduce(
    (count, entry) =>
      entry.pixels !== undefined && entry.pixels > 0 ? count + 1 : count,
    0,
  );
  const matched = statsArray.reduce(
    (count, entry) => (entry.pixels === 0 ? count + 1 : count),
    0,
  );
  const notOptimized = statsArray.reduce(
    (count, entry) => (entry.lengthOpt === undefined ? count + 1 : count),
    0,
  );
  const totalPixelMismatches = statsArray.reduce(
    (count, entry) => count + (entry.pixels ?? 0),
    0,
  );
  const totalPasses = statsArray.reduce(
    (count, entry) => count + (entry.passes ?? 0),
    0,
  );
  const optTime = statsArray.reduce(
    (time, entry) => (entry.time === undefined ? time : time + entry.time),
    0,
  );
  const totalInputSize = statsArray.reduce(
    (size, entry) =>
      entry.lengthOrig === undefined ? size : size + entry.lengthOrig,
    0,
  );
  const totalCompression = statsArray.reduce(
    (compression, entry) =>
      entry.lengthOpt === undefined || entry.lengthOrig === undefined
        ? compression
        : compression + (entry.lengthOrig - entry.lengthOpt),
    0,
  );

  console.info(`Mismatched: ${mismatched}`);
  console.info(`Not Optimized: ${notOptimized}`);
  console.info(`Matched: ${matched}`);
  console.info(
    `Total Compression: ${totalCompression} bytes (${toFixed((totalCompression / totalInputSize) * 100, 2)}%)`,
  );
  console.info(`Total Pixel Mismatches: ${totalPixelMismatches}`);
  console.info(
    `Total Passes: ${totalPasses} (${toFixed(totalPasses / (mismatched + matched), 2)} average)`,
  );
  console.info(
    `Regression tests completed in ${totalTime}ms (opt time=${optTime}, opt phase time=${optPhaseTime}, comp time = ${compPhaseTime}, ${numWorkers} workers)`,
  );
}

/**
 * @param {StatisticsMap} statsMap
 */
function writeLog(statsMap) {
  const statArray = [
    [
      'Name',
      'Orig Len',
      'Opt Len',
      'Passes',
      'Time (ms)',
      'Reduction',
      'Pixels',
    ].join('\t'),
  ];
  const sortedKeys = [];
  for (const key of statsMap.keys()) {
    sortedKeys.push(key);
  }
  for (const name of sortedKeys.sort()) {
    const fileStats = statsMap.get(name);
    if (!fileStats) {
      throw new Error();
    }
    const orig = fileStats.lengthOrig;
    const opt = fileStats.lengthOpt;
    const reduction = orig === undefined || opt === undefined ? '' : orig - opt;
    statArray.push(
      [
        name,
        orig,
        opt,
        fileStats.passes,
        fileStats.time,
        reduction,
        fileStats.pixels,
      ].join('\t'),
    );
  }

  const statsFileName = `./ignored/logs/regression-stats-${new Date()
    .toISOString()
    .replace(/:/g, '')
    .substring(0, 17)}.tsv`;
  fs.mkdirSync(path.dirname(statsFileName), { recursive: true });
  fs.writeFileSync(statsFileName, statArray.join('\n'));
}

program
  .option(
    '--plugins [pluginNames...]',
    'Run the specified plugins rather than default plugins',
  )
  .option(
    '--enable <plugin...>',
    'Specify one or more builtin plugins to run in addition to those in those default plugins or plugins in --config',
  )
  .option(
    '--options <FILENAME>',
    'Path to a JSON file containing configuration parameters for enabled plugins',
  )
  .option(
    '--disable <plugin...>',
    'Specify one or more plugins which should not be run ',
  )
  .option(
    '-b, --browser <chromium | firefox | webkit>',
    'Browser engine to use in testing',
    'webkit',
  )
  .option(
    '-i, --inputdir <dir>',
    'Location of input files',
    './ignored/regression/input-raw',
  )
  .option('-l, --log', 'Write statistics log file to ./tmp directory')
  .option('--workers [number of workers]', 'number of workers to use')
  .action(performRegression);

program.parseAsync();
