import { cwd } from 'node:process';
import fs from 'node:fs';
import path from 'path';
import { program } from 'commander';
import * as playwright from 'playwright';
import { toFixed } from '../lib/svgo/tools.js';
import { readJSONFile } from '../lib/svgo/tools-node.js';
import { PNG } from 'pngjs';
import Pixelmatch from 'pixelmatch';
import { optimizeResolved, resolvePlugins } from '../lib/svgo.js';
import { getHeapStatistics } from 'node:v8';
import { pathToFileURL } from 'node:url';
import { cpus } from 'node:os';

/**
 * @typedef {'chromium' | 'firefox' | 'webkit'} BrowserID
 * @typedef {{
 * plugins?:string[],enable?:string[],disable?:string[],options?:string,inputdir:string,log:boolean,
 * browser:BrowserID,
 * browserPages:string,
 * reusePages:boolean,
 * pretty?:boolean,
 * }} CmdLineOptions
 * @typedef {Map<string,{lengthOrig?:number,lengthOpt?:number,passes?:number,time?:number,pixels?:number}>} StatisticsMap
 */

class BrowserPages {
  /** @type {Promise<import('playwright').Page>[]} */
  #pages;
  /** @type {function[]} */
  #pendingPromises = [];
  #browser;
  #browserContext;

  /**
   * @param {Promise<import('playwright').Page>[]} pages
   * @param {import('playwright').Browser} browser
   * @param {import('playwright').BrowserContext} browserContext
   */
  constructor(pages, browser, browserContext) {
    this.#pages = pages;
    this.#browser = browser;
    this.#browserContext = browserContext;
  }

  async close() {
    await Promise.all(this.#pages);
    this.#browser.close();
  }

  /**
   * @param {number} numPages
   * @param {BrowserID} browserName
   * @param {boolean} reusePages
   * @returns {Promise<BrowserPages>}
   */
  static async createPages(numPages, browserName, reusePages) {
    const browserType = playwright[browserName];

    const browser = await browserType.launch();
    const browserContext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: BROWSER_WIDTH, height: BROWSER_HEIGHT },
    });
    browserContext.setDefaultNavigationTimeout(0);

    const pageArray = Array.from(Array(numPages), () =>
      browserContext.newPage(),
    );
    return reusePages
      ? new BrowserPagesReuse(pageArray, browser, browserContext)
      : new BrowserPages(pageArray, browser, browserContext);
  }

  /**
   * @param {Promise<import('playwright').Page>} page
   */
  addAvailablePage(page) {
    this.#pages.push(Promise.resolve(page));
  }

  /**
   * @returns {Function|undefined}
   */
  getNextPendingRequest() {
    return this.#pendingPromises.shift();
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
   * @returns {Promise<void>}
   */
  async releasePage(page) {
    const newPage = this.#browserContext.newPage();
    const pending = this.getNextPendingRequest();
    return page.close().then(() => {
      if (pending) {
        pending(newPage);
      } else {
        this.addAvailablePage(Promise.resolve(newPage));
      }
    });
  }
}

class BrowserPagesReuse extends BrowserPages {
  /**
   * @param {import('playwright').Page} page
   * @returns {Promise<void>}
   */
  async releasePage(page) {
    const pending = this.getNextPendingRequest();
    if (pending) {
      pending(page);
    } else {
      this.addAvailablePage(Promise.resolve(page));
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

  const numBrowserPages = options.browserPages
    ? parseInt(options.browserPages)
    : cpus().length;

  const browserPages = await BrowserPages.createPages(
    numBrowserPages,
    browserName,
    options.reusePages,
  );

  const diffRootDir = path.join(cwd(), './ignored/regression/diffs');
  fs.rmSync(diffRootDir, { force: true, recursive: true });

  // Initialize statistics array.
  /** @type {StatisticsMap} */
  const stats = new Map();

  relativeFilePaths.forEach((name) => stats.set(name, {}));

  const start = Date.now();

  await optimizeFiles(
    inputDir,
    outputDir,
    diffRootDir,
    relativeFilePaths,
    options,
    stats,
    browserPages,
  );
  const optPhaseTime = Date.now() - start;

  const compStart = Date.now();

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

  await browserPages.close();
}

/**
 * @param {BrowserPages} pages
 * @param {string} inputDirRoot
 * @param {string} outputDirRoot
 * @param {string} diffRootDir
 * @param {string} relativeFilePath
 * @param {StatisticsMap} statsMap
 * @returns {Promise<void>}
 */
async function compareFile(
  pages,
  inputDirRoot,
  outputDirRoot,
  diffRootDir,
  relativeFilePath,
  statsMap,
) {
  const stats = getStats(statsMap, relativeFilePath);
  if (stats.lengthOpt === undefined) {
    // File was not optimized, don't compare.
    return;
  }

  const screenshots = Promise.all([
    getScreenShotFromFile(pages, inputDirRoot, relativeFilePath),
    getScreenShotFromFile(pages, outputDirRoot, relativeFilePath),
  ]);

  return screenshots.then((screenshots) => {
    const diff = new PNG({ width: BROWSER_WIDTH, height: BROWSER_HEIGHT });
    const mismatchCount = Pixelmatch(
      screenshots[0].data,
      screenshots[1].data,
      diff.data,
      BROWSER_WIDTH,
      BROWSER_HEIGHT,
    );

    stats.pixels = mismatchCount;

    return mismatchCount > 0
      ? writeDiff(diffRootDir, relativeFilePath, diff)
      : undefined;
  });
}

/**
 * @param {BrowserPages} pages
 * @param {import('playwright').Page} page
 * @returns {Promise<import('pngjs').PNGWithMetadata>}
 */
async function getScreenShot(pages, page) {
  return page
    .screenshot(screenshotOptions)
    .then((result) => {
      return Promise.all([PNG.sync.read(result), pages.releasePage(page)]);
    })
    .then((result) => result[0]);
}

/**
 * @param {BrowserPages} pages
 * @param {string} rootDir
 * @param {string} relativeFilePath
 * @returns {Promise<import('pngjs').PNGWithMetadata>}
 */
async function getScreenShotFromFile(pages, rootDir, relativeFilePath) {
  const url = pathToFileURL(path.join(rootDir, relativeFilePath));
  return pages
    .newPage()
    .then((page) => {
      return Promise.all([page, page.goto(url.toString())]);
    })
    .then((result) => {
      return getScreenShot(pages, result[0]);
    });
}

// /**
//  * @param {BrowserPages} pages
//  * @param {string} strContent
//  * @returns {Promise<import('pngjs').PNGWithMetadata>}
//  */
// async function getScreenShotFromString(pages, strContent) {
//   return pages
//     .newPage()
//     .then((page) => {
//       return Promise.all([page, page.setContent(strContent)]);
//     })
//     .then((result) => {
//       return getScreenShot(pages, result[0]);
//     });
// }

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
 * @param {string} diffDir
 * @param {string[]} relativeFilePaths
 * @param {CmdLineOptions} options
 * @param {StatisticsMap} statsMap
 * @param {BrowserPages} browserPages
 * @returns {Promise<void[]>}
 */
async function optimizeFiles(
  inputDir,
  outputDir,
  diffDir,
  relativeFilePaths,
  options,
  statsMap,
  browserPages,
) {
  /** @type {import('../lib/svgo.js').Config} */
  const config = {
    pluginNames: options.plugins,
    enable: options.enable,
    options: options.options ? readJSONFile(options.options) : undefined,
    disable: options.disable,
    js2svg: { pretty: options.pretty },
  };

  const resolvedPlugins = resolvePlugins(config);

  return Promise.all(
    relativeFilePaths.map((filePath) =>
      optimizeFile(
        inputDir,
        outputDir,
        diffDir,
        filePath,
        config,
        resolvedPlugins,
        statsMap,
        browserPages,
      ),
    ),
  );
}

/**
 * @param {string} inputDirRoot
 * @param {string} outputDirRoot
 * @param {string} diffDirRoot
 * @param {string} relativePath
 * @param {import('../lib/svgo.js').Config} config
 * @param {import('../lib/svgo.js').ResolvedPlugins} resolvedPlugins
 * @param {StatisticsMap} statsMap
 * @param {BrowserPages} browserPages
 * @returns {Promise<void>}
 */
async function optimizeFile(
  inputDirRoot,
  outputDirRoot,
  diffDirRoot,
  relativePath,
  config,
  resolvedPlugins,
  statsMap,
  browserPages,
) {
  const inputPath = path.join(inputDirRoot, relativePath);

  return fs.promises
    .readFile(inputPath, 'utf8')
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
      return writeOutputFile(outputDirRoot, relativePath, optimizedData.data);
    })
    .then(() =>
      compareFile(
        browserPages,
        inputDirRoot,
        outputDirRoot,
        diffDirRoot,
        relativePath,
        statsMap,
      ),
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
    `Peak Memory: ${(
      getHeapStatistics().peak_malloced_memory /
      (1024 * 1024)
    ).toLocaleString(undefined, { maximumFractionDigits: 2 })}Mb`,
  );
  console.info(
    `Regression tests completed in ${totalTime}ms (opt time=${optTime}, opt phase time=${optPhaseTime}, comp time = ${compPhaseTime}, browser=${browserName}, ${numBrowserPages} browser pages)`,
  );
}

/**
 * @param {string} diffRootDir
 * @param {string} relativeFilePath
 * @param {PNG} diff
 */
async function writeDiff(diffRootDir, relativeFilePath, diff) {
  // Write the diff image.
  const filePath = path.join(diffRootDir, relativeFilePath) + '.png';
  fs.promises
    .mkdir(path.dirname(filePath), { recursive: true })
    .then(() => fs.promises.writeFile(filePath, PNG.sync.write(diff)));
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

/**
 * @param {string|undefined} outputDirRoot
 * @param {string} relativeFilePath
 * @param {string} output
 * @returns {Promise<void>}
 */
async function writeOutputFile(outputDirRoot, relativeFilePath, output) {
  if (outputDirRoot === undefined) {
    return;
  }
  const outputPath = path.join(outputDirRoot, relativeFilePath);
  const outputDir = path.dirname(outputPath);

  return fs.promises
    .mkdir(outputDir, { recursive: true })
    .then(() => fs.promises.writeFile(outputPath, output));
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
  )
  .option(
    '--no-reuse-pages',
    'create new browser pages rather than reusing existing pages',
  )
  .option('--pretty', 'Add line breaks and indentation to output')
  .action(performRegression);

program.parseAsync();
