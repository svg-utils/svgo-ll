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

/**
 * @typedef {{
 * plugins?:string[],enable?:string[],disable?:string[],options?:string,inputdir:string,log:boolean,
 * browser:'chromium' | 'firefox' | 'webkit'
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

  // Initialize statistics array.
  /** @type {StatisticsMap} */
  const stats = new Map();

  relativeFilePaths.forEach((name) => stats.set(name, {}));

  const start = process.hrtime.bigint();

  await optimizeFiles(inputDir, outputDir, relativeFilePaths, options, stats);

  await compareOutput(inputDir, outputDir, relativeFilePaths, options, stats);

  const time = (process.hrtime.bigint() - start) / BigInt(1e6);
  showStats(stats, time);

  if (options.log) {
    writeLog(stats);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string} inputRootDir
 * @param {string} outputRootDir
 * @param {string} relativeFilePath
 * @param {StatisticsMap} statsMap
 */
async function compareFile(
  page,
  inputRootDir,
  outputRootDir,
  relativeFilePath,
  statsMap,
) {
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

  const stats = getStats(statsMap, relativeFilePath);
  stats.pixels = mismatchCount;
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
  const page = await context.newPage();

  for (const filePath of relativeFilePaths) {
    await compareFile(page, inputDir, outputDir, filePath, statsMap);
  }

  await page.close();
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
 * @param {string[]} relativeFilePaths
 * @param {CmdLineOptions} options
 * @param {StatisticsMap} statsMap
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

  for (const filePath of relativeFilePaths) {
    await optimizeFile(inputDir, outputDir, filePath, config, statsMap);
  }
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
 * @param {import('commander').OptionValues} options
 */
// async function performTests(options) {
//   let mismatched = 0;
//   let passed = 0;
//   const notOptimized = new Set();
//   let totalPasses = 0;
//   let totalInputSize = 0;
//   let totalCompression = 0;
//   let totalPixelMismatches = 0;

//   /** @type {'chromium' | 'firefox' | 'webkit'} */
//   const browserStr = ['chromium', 'firefox', 'webkit'].includes(options.browser)
//     ? options.browser
//     : // Default to webkit since that shows fewer false positives.
//       'webkit';
//   const browserType = playwright[browserStr];

//   /** @type {import('../lib/svgo.js').Config} */
//   const config = {
//     pluginNames: options.plugins,
//     enable: options.enable,
//     options: options.options ? readJSONFile(options.options) : undefined,
//     disable: options.disable,
//   };

//   /**
//    * @param {string[]} list
//    * @returns {Promise<boolean>}
//    */
//   async function runTests(list) {
//     console.info('Start browser…');
//     /**
//      * @param {import('playwright').Page} page
//      * @param {string} name
//      */
//     const processFile = async (page, name) => {
//       await page.goto(`http://localhost:5000/original/${name}`);
//       const originalBuffer = await page.screenshot(screenshotOptions);

//       await page.goto(`http://localhost:5000/optimized/${name}`);
//       const optimizedBuffer = await page.screenshot(screenshotOptions);

//       const diff = new PNG({ width, height });
//       const originalPng = PNG.sync.read(originalBuffer);
//       const optimizedPng = PNG.sync.read(optimizedBuffer);
//       const mismatchCount = pixelmatch(
//         originalPng.data,
//         optimizedPng.data,
//         diff.data,
//         width,
//         height,
//       );
//       if (notOptimized.has(name)) {
//         return;
//       }

//       const fileStats = globalStats.get(name.replace(/\\/g, '/'));
//       if (!fileStats) {
//         throw new Error();
//       }
//       fileStats.pixels = mismatchCount;
//       totalPixelMismatches += mismatchCount;
//       if (mismatchCount <= 0) {
//         passed++;
//       } else {
//         mismatched++;
//         console.error(
//           colors.red(`${name} has ${mismatchCount} pixel mismatches`),
//         );
//         if (diff) {
//           const file = path.join(
//             __dirname,
//             'regression-diffs',
//             `${name}.diff.png`,
//           );
//           await fsXXX.mkdir(path.dirname(file), { recursive: true });
//           await fsXXX.writeFile(file, PNG.sync.write(diff));
//         }
//       }
//     };

//     const worker = async () => {
//       let item;
//       const page = await context.newPage();
//       page.setDefaultNavigationTimeout(0);
//       while ((item = list.pop())) {
//         await processFile(page, item);
//       }
//       await page.close();
//     };

//     const browser = await browserType.launch();
//     const context = await browser.newContext({
//       javaScriptEnabled: false,
//       viewport: { width, height },
//     });

//     const numWorkers = options.workers
//       ? parseInt(options.workers)
//       : os.cpus().length * 2;

//     console.info(`Number of workers: ${numWorkers}`);
//     await Promise.all(Array.from(new Array(numWorkers), () => worker()));
//     await browser.close();
//     console.info(`Mismatched: ${mismatched}`);
//     console.info(`Not Optimized: ${notOptimized.size}`);
//     console.info(`Passed: ${passed}`);
//     console.info(
//       `Total Compression: ${totalCompression} bytes (${toFixed((totalCompression / totalInputSize) * 100, 2)}%)`,
//     );
//     console.info(`Total Pixel Mismatches: ${totalPixelMismatches}`);
//     console.info(
//       `Total Passes: ${totalPasses} (${toFixed(totalPasses / (mismatched + passed), 2)} average)`,
//     );

//     // Write statistics.
//     const statArray = [
//       [
//         'Name',
//         'Orig Len',
//         'Opt Len',
//         'Passes',
//         'Time (ms)',
//         'Reduction',
//         'Pixels',
//       ].join('\t'),
//     ];
//     const sortedKeys = [];
//     for (const key of globalStats.keys()) {
//       sortedKeys.push(key);
//     }
//     for (const name of sortedKeys.sort()) {
//       const fileStats = globalStats.get(name);
//       if (!fileStats) {
//         throw new Error();
//       }
//       const orig = fileStats.lengthOrig;
//       const opt = fileStats.lengthOpt;
//       const reduction = orig - opt;
//       statArray.push(
//         [
//           name,
//           orig,
//           opt,
//           fileStats.passes,
//           fileStats.time,
//           reduction,
//           fileStats.pixels,
//         ].join('\t'),
//       );
//     }

//     if (options.log) {
//       const statsFileName = `tmp/regression-stats-${new Date()
//         .toISOString()
//         .replace(/:/g, '')
//         .substring(0, 17)}.tsv`;
//       await fsXXX.mkdir(path.dirname(statsFileName), { recursive: true });
//       await fsXXX.writeFile(statsFileName, statArray.join('\n'));
//     }

//     return mismatched === 0;
//   }

//   try {
//     const start = process.hrtime.bigint();
//     const fixturesDir = path.join(cwd(), options.inputdir);
//     const filesPromise = fsXXX.readdir(fixturesDir, { recursive: true });
//     const server = http.createServer(async (req, res) => {
//       if (req.url === undefined) {
//         throw new Error();
//       }
//       const name = decodeURI(req.url.slice(req.url.indexOf('/', 1)))
//         .replaceAll('(', '%28')
//         .replaceAll(')', '%29');
//       const statsName = name.substring(1);
//       let file;
//       try {
//         file = await fsXXX.readFile(path.join(fixturesDir, name), 'utf-8');
//       } catch {
//         if (globalStats.has(statsName)) {
//           console.error(`error reading file ${name} (url=${req.url})`);
//           notOptimized.add(statsName);
//         }
//         res.statusCode = 404;
//         res.end();
//         return;
//       }

//       const fileStats = globalStats.get(statsName);
//       if (!fileStats) {
//         throw new Error();
//       }
//       if (req.url.startsWith('/original/')) {
//         fileStats.lengthOrig = file.length;
//         res.setHeader('Content-Type', 'image/svg+xml');
//         res.end(file);
//         return;
//       }
//       if (req.url.startsWith('/optimized/')) {
//         const optimized = optimize(file, config);
//         fileStats.lengthOpt = optimized.data.length;
//         fileStats.time = optimized.time ?? -2;

//         if (optimized.error) {
//           notOptimized.add(name.substring(1));
//         }
//         fileStats.passes = optimized.passes ?? 0;
//         totalPasses += optimized.passes ?? 0;
//         totalInputSize += file.length;
//         totalCompression += file.length - optimized.data.length;
//         res.setHeader('Content-Type', 'image/svg+xml');
//         res.end(optimized.data);
//         return;
//       }
//       throw new Error(`unknown path ${req.url}`);
//     });
//     await new Promise((resolve) => {
//       // @ts-ignore
//       server.listen(5000, resolve);
//     });
//     const list = (await filesPromise).filter((name) => name.endsWith('.svg'));

//     // Initialize statistics array.
//     list.forEach((name) =>
//       globalStats.set(name.replace(/\\/g, '/'), {
//         lengthOrig: 0,
//         lengthOpt: 0,
//         passes: 0,
//         time: -1,
//         pixels: -1,
//       }),
//     );

//     const passed = await runTests(list);
//     server.close();
//     const end = process.hrtime.bigint();
//     const diff = (end - start) / BigInt(1e6);

//     let optTime = 0;
//     globalStats.forEach((value) => {
//       if (value.time > 0) {
//         optTime = optTime + value.time;
//       }
//     });

//     if (passed) {
//       console.info(
//         `Regression tests successfully completed in ${diff}ms (opt time=${optTime})`,
//       );
//     } else {
//       console.error(
//         colors.red(
//           `Regression tests failed in ${diff}ms (opt time=${optTime})`,
//         ),
//       );
//       process.exit(1);
//     }
//   } catch (error) {
//     console.error(error);
//     process.exit(1);
//   }
// }

/**
 * @param {StatisticsMap} stats
 * @param {bigint} time
 */
function showStats(stats, time) {
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
  console.info(`Regression tests completed in ${time}ms (opt time=${optTime})`);
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
