import { cwd } from 'node:process';
import fs from 'node:fs';
import path from 'path';
import { program } from 'commander';
import * as playwright from 'playwright';
import { toFixed } from '../lib/svgo/tools.js';
import { readJSONFile } from '../lib/svgo/tools-node.js';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import Pixelmatch from 'pixelmatch';
import { cpus } from 'node:os';
import { optimizeResolved, resolvePlugins } from '../lib/svgo.js';

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
  timeout: 0,
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

  await optimizeFiles(inputDir, outputDir, relativeFilePaths, options, stats);
  const optPhaseTime = Date.now() - start;

  const compStart = Date.now();
  await compareOutput(inputDir, outputDir, relativeFilePaths, options, stats);

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
 * @param {import('playwright').BrowserContext} browserContext
 * @param {string} inputRootDir
 * @param {string} outputRootDir
 * @param {string} diffRootDir
 * @param {string} relativeFilePath
 * @param {StatisticsMap} statsMap
 */
async function compareFile(
  browserContext,
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

  return Promise.all([
    getScreenShot(browserContext, inputRootDir, relativeFilePath),
    getScreenShot(browserContext, outputRootDir, relativeFilePath),
  ]).then((screenshots) => {
    const diff = new PNG({ width: BROWSER_WIDTH, height: BROWSER_HEIGHT });
    const mismatchCount = Pixelmatch(
      screenshots[0].data,
      screenshots[1].data,
      diff.data,
      BROWSER_WIDTH,
      BROWSER_HEIGHT,
    );

    stats.pixels = mismatchCount;

    if (mismatchCount > 0) {
      // Write the diff image.
      const filePath = path.join(diffRootDir, relativeFilePath) + '.png';
      fs.promises
        .mkdir(path.dirname(filePath), { recursive: true })
        .then(() => fs.promises.writeFile(filePath, PNG.sync.write(diff)));
    }
  });
}

/**
 * @param {string} inputDir
 * @param {string} outputDir
 * @param {string[]} relativeFilePaths
 * @param {CmdLineOptions} options
 * @param {StatisticsMap} statsMap
 */
async function compareOutput(
  inputDir,
  outputDir,
  relativeFilePaths,
  options,
  statsMap,
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
  context.setDefaultNavigationTimeout(0);

  const diffRootDir = path.join(cwd(), './ignored/regression/diffs');
  fs.rmSync(diffRootDir, { force: true, recursive: true });

  return Promise.all(
    relativeFilePaths.map((filePath) =>
      compareFile(
        context,
        inputDir,
        outputDir,
        diffRootDir,
        filePath,
        statsMap,
      ),
    ),
  ).finally(() => {
    browser.close();
  });
}

/**
 * @param {import('playwright').BrowserContext} browserContext
 * @param {string} rootDir
 * @param {string} relativeFilePath
 * @returns {Promise<import('pngjs').PNGWithMetadata>}
 */
async function getScreenShot(browserContext, rootDir, relativeFilePath) {
  const url = pathToFileURL(path.join(rootDir, relativeFilePath));
  return browserContext
    .newPage()
    .then((page) => {
      page.goto(url.toString());
      return page;
    })
    .then((page) => {
      return Promise.all([page.screenshot(screenshotOptions), page]);
    })
    .then((result) => {
      result[1].close();
      return PNG.sync.read(result[0]);
    });
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
 * @param {string[]} relativeFilePaths
 * @param {CmdLineOptions} options
 * @param {StatisticsMap} statsMap
 * @returns {Promise<void[]>}
 */
async function optimizeFiles(
  inputDir,
  outputDir,
  relativeFilePaths,
  options,
  statsMap,
) {
  /** @type {import('../lib/svgo.js').Config} */
  const config = {
    pluginNames: options.plugins,
    enable: options.enable,
    options: options.options ? readJSONFile(options.options) : undefined,
    disable: options.disable,
  };

  const resolvedPlugins = resolvePlugins(config);

  return Promise.all(
    relativeFilePaths.map((filePath) =>
      optimizeFile(
        inputDir,
        outputDir,
        filePath,
        config,
        resolvedPlugins,
        statsMap,
      ),
    ),
  );
}

/**
 * @param {string} inputDirRoot
 * @param {string} outputDirRoot
 * @param {string} relativePath
 * @param {import('../lib/svgo.js').Config} config
 * @param {import('../lib/svgo.js').CustomPlugin[]} resolvedPlugins
 * @param {StatisticsMap} statsMap
 * @returns {Promise<void>}
 */
async function optimizeFile(
  inputDirRoot,
  outputDirRoot,
  relativePath,
  config,
  resolvedPlugins,
  statsMap,
) {
  const inputPath = path.join(inputDirRoot, relativePath);
  const outputPath = path.join(outputDirRoot, relativePath);
  const outputDir = path.dirname(outputPath);

  return fs.promises
    .mkdir(outputDir, { recursive: true })
    .then(() => fs.promises.readFile(inputPath, 'utf8'))
    .then((input) => {
      const stats = getStats(statsMap, relativePath);
      if (!stats) {
        throw new Error(`no statistics for ${relativePath}`);
      }
      stats.lengthOrig = input.length;

      const optimizedData = optimizeResolved(input, config, resolvedPlugins);
      if (!optimizedData.error) {
        stats.lengthOpt = optimizedData.data.length;
        stats.passes = optimizedData.passes;
        stats.time = optimizedData.time;
      }
      return optimizedData;
    })
    .then((optimizedData) =>
      fs.promises.writeFile(outputPath, optimizedData.data),
    );
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
    'chromium',
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
