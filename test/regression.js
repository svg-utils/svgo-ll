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
import { optimizeResolved, resolvePlugins } from '../lib/svgo.js';

/**
 * @typedef {'chromium' | 'firefox' | 'webkit'} BrowserID
 * @typedef {{
 * plugins?:string[],enable?:string[],disable?:string[],options?:string,inputdir:string,log:boolean,
 * browser:BrowserID,
 * browserPages:string
 * }} CmdLineOptions
 * @typedef {Map<string,{lengthOrig?:number,lengthOpt?:number,passes?:number,time?:number,pixels?:number}>} StatisticsMap
 */

class BrowserPages {
  /** @type {import('playwright').Page[]} */
  #pages;
  /** @type {function[]} */
  #pendingPromises = [];
  #browser;

  /**
   * @param {import('playwright').Page[]} pages
   * @param {import('playwright').Browser} browser
   */
  constructor(pages, browser) {
    this.#pages = pages;
    this.#browser = browser;
  }

  async close() {
    this.#browser.close();
  }

  /**
   * @param {number} numPages
   * @param {BrowserID} browserName
   * @returns {Promise<BrowserPages>}
   */
  static async createPages(numPages, browserName) {
    const browserType = playwright[browserName];

    const browser = await browserType.launch();
    const browserContext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: BROWSER_WIDTH, height: BROWSER_HEIGHT },
    });
    browserContext.setDefaultNavigationTimeout(0);

    const pageArray = await Promise.all(
      Array.from(Array(numPages), () => browserContext.newPage()),
    );
    return new BrowserPages(pageArray, browser);
  }

  /**
   * @returns {Promise<import('playwright').Page>}
   */
  async newPage() {
    const page = this.#pages.pop();
    if (page) {
      return page;
    }

    let resolve;
    const promise = new Promise((res) => {
      resolve = res;
    });

    // const { promise, resolve } = Promise.withResolvers();
    // @ts-ignore - replace with Promise.withResolvers() when that is supported by all Node versions
    this.#pendingPromises.push(resolve);
    return promise;
  }

  /**
   * @param {import('playwright').Page} page
   * @returns {void}
   */
  releasePage(page) {
    const pending = this.#pendingPromises.shift();
    if (pending) {
      pending(page);
    } else {
      this.#pages.push(page);
    }
  }
}

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

  /** @type {BrowserID} */
  const browserName = ['chromium', 'firefox', 'webkit'].includes(
    options.browser,
  )
    ? options.browser
    : // Default to webkit since that shows fewer false positives.
      'webkit';

  const numBrowserPages = parseInt(options.browserPages);

  const browserPages = await BrowserPages.createPages(
    numBrowserPages,
    browserName,
  );

  // Initialize statistics array.
  /** @type {StatisticsMap} */
  const stats = new Map();

  relativeFilePaths.forEach((name) => stats.set(name, {}));

  const start = Date.now();

  await optimizeFiles(inputDir, outputDir, relativeFilePaths, options, stats);
  const optPhaseTime = Date.now() - start;

  const compStart = Date.now();
  await compareOutput(
    inputDir,
    outputDir,
    relativeFilePaths,
    stats,
    browserPages,
  );

  showStats(
    stats,
    Date.now() - start,
    optPhaseTime,
    Date.now() - compStart,
    browserName,
    numBrowserPages,
  );

  if (options.log) {
    writeLog(stats);
  }
}

/**
 * @param {BrowserPages} pages
 * @param {string} inputRootDir
 * @param {string} outputRootDir
 * @param {string} diffRootDir
 * @param {string} relativeFilePath
 * @param {StatisticsMap} statsMap
 */
async function compareFile(
  pages,
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
    getScreenShot(pages, inputRootDir, relativeFilePath),
    getScreenShot(pages, outputRootDir, relativeFilePath),
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
 * @param {StatisticsMap} statsMap
 * @param {BrowserPages} pages
 */
async function compareOutput(
  inputDir,
  outputDir,
  relativeFilePaths,
  statsMap,
  pages,
) {
  const diffRootDir = path.join(cwd(), './ignored/regression/diffs');
  fs.rmSync(diffRootDir, { force: true, recursive: true });

  return Promise.all(
    relativeFilePaths.map((filePath) =>
      compareFile(pages, inputDir, outputDir, diffRootDir, filePath, statsMap),
    ),
  ).finally(() => pages.close());
}

/**
 * @param {BrowserPages} pages
 * @param {string} rootDir
 * @param {string} relativeFilePath
 * @returns {Promise<import('pngjs').PNGWithMetadata>}
 */
async function getScreenShot(pages, rootDir, relativeFilePath) {
  const url = pathToFileURL(path.join(rootDir, relativeFilePath));
  return pages
    .newPage()
    .then((page) => {
      return Promise.all([page, page.goto(url.toString())]);
    })
    .then((result) => {
      return Promise.all([result[0].screenshot(screenshotOptions), result[0]]);
    })
    .then((result) => {
      pages.releasePage(result[1]);
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
 * @param {string} browserName
 * @param {number} numBrowserPages
 */
function showStats(
  stats,
  totalTime,
  optPhaseTime,
  compPhaseTime,
  browserName,
  numBrowserPages,
) {
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
    `Regression tests completed in ${totalTime}ms (opt time=${optTime}, opt phase time=${optPhaseTime}, comp time = ${compPhaseTime}, browser=${browserName}, ${numBrowserPages} browser pages)`,
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
  .option(
    '-p, --browser-pages [number]',
    'number of browser pages to use for diff',
    '2',
  )
  .action(performRegression);

program.parseAsync();
