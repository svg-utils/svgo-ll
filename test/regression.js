import fs from 'node:fs/promises';
import { cwd } from 'node:process';
import { fileURLToPath } from 'node:url';
import http from 'http';
import os from 'os';
import path from 'path';
import { program } from 'commander';
import colors from 'picocolors';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { optimize } from '../lib/svgo.js';
import { toFixed } from '../lib/svgo/tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const width = 960;
const height = 720;

/** @type {Object<string,{lengthOrig:number,lengthOpt:number,pixels:number}>} */
const stats = {};

/** @type {import('playwright').PageScreenshotOptions} */
const screenshotOptions = {
  omitBackground: true,
  clip: { x: 0, y: 0, width, height },
  animations: 'disabled',
};

/**
 * @param {import('commander').OptionValues} options
 */
async function performTests(options) {
  let mismatched = 0;
  let passed = 0;
  const notOptimized = new Set();
  let totalInputSize = 0;
  let totalCompression = 0;
  let totalPixelMismatches = 0;

  /** @type {import('../lib/svgo.js').Config} */
  const config = {
    preset: options.preset,
    enable: options.enable,
    disable: options.disable,
  };

  /**
   * @param {string[]} list
   * @returns {Promise<boolean>}
   */
  async function runTests(list) {
    console.info('Start browser…');
    /**
     * @param {import('playwright').Page} page
     * @param {string} name
     */
    const processFile = async (page, name) => {
      const fileStats = {
        lengthOrig: 0,
        lengthOpt: 0,
        pixels: -1,
      };
      stats[name.replace(/\\/g, '/')] = fileStats;

      await page.goto(`http://localhost:5000/original/${name}`);
      const originalBuffer = await page.screenshot(screenshotOptions);
      await page.goto(`http://localhost:5000/optimized/${name}`);
      const optimizedBufferPromise = page.screenshot(screenshotOptions);

      const writeDiffs = process.env.NO_DIFF == null;
      const diff = writeDiffs && new PNG({ width, height });
      const originalPng = PNG.sync.read(originalBuffer);
      const optimizedPng = PNG.sync.read(await optimizedBufferPromise);
      const mismatchCount = pixelmatch(
        originalPng.data,
        optimizedPng.data,
        diff ? diff.data : null,
        width,
        height,
      );
      if (notOptimized.has(name)) {
        return;
      }

      fileStats.pixels = mismatchCount;
      totalPixelMismatches += mismatchCount;
      if (mismatchCount <= 0) {
        passed++;
      } else {
        mismatched++;
        console.error(
          colors.red(`${name} has ${mismatchCount} pixel mismatches`),
        );
        if (diff) {
          const file = path.join(
            __dirname,
            'regression-diffs',
            `${name}.diff.png`,
          );
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, PNG.sync.write(diff));
        }
      }
    };

    const worker = async () => {
      let item;
      const page = await context.newPage();
      while ((item = list.pop())) {
        await processFile(page, item);
      }
      await page.close();
    };

    const browser = await chromium.launch();
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height },
    });
    await Promise.all(
      Array.from(new Array(os.cpus().length * 2), () => worker()),
    );
    await browser.close();
    console.info(`Mismatched: ${mismatched}`);
    console.info(`Not Optimized: ${notOptimized.size}`);
    console.info(`Passed: ${passed}`);
    console.info(
      `Total Compression: ${totalCompression} bytes (${toFixed((totalCompression / totalInputSize) * 100, 2)}%)`,
    );
    console.info(`Total Pixel Mismatches: ${totalPixelMismatches}`);

    // Write statistics.
    const statArray = [
      ['Name', 'Orig Len', 'Opt Len', 'Reduction', 'Pixels'].join('\t'),
    ];
    for (const name of Object.keys(stats).sort()) {
      const fileStats = stats[name];
      const orig = fileStats.lengthOrig;
      const opt = fileStats.lengthOpt;
      const reduction = orig - opt;
      statArray.push([name, orig, opt, reduction, fileStats.pixels].join('\t'));
    }

    if (options.log) {
      const statsFileName = `tmp/regression-stats-${new Date()
        .toISOString()
        .replace(/:/g, '')
        .substring(0, 17)}.tsv`;
      await fs.mkdir(path.dirname(statsFileName), { recursive: true });
      await fs.writeFile(statsFileName, statArray.join('\n'));
    }

    return mismatched === 0;
  }

  try {
    const start = process.hrtime.bigint();
    const fixturesDir = path.join(cwd(), options.inputdir);
    const filesPromise = fs.readdir(fixturesDir, { recursive: true });
    const server = http.createServer(async (req, res) => {
      if (req.url === undefined) {
        throw new Error();
      }
      const name = req.url.slice(req.url.indexOf('/', 1));
      const statsName = name.substring(1);
      let file;
      try {
        file = await fs.readFile(path.join(fixturesDir, name), 'utf-8');
      } catch {
        res.statusCode = 404;
        res.end();
        return;
      }

      if (req.url.startsWith('/original/')) {
        stats[statsName].lengthOrig = file.length;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.end(file);
        return;
      }
      if (req.url.startsWith('/optimized/')) {
        const optimized = optimize(file, config);
        stats[statsName].lengthOpt = optimized.data.length;

        if (optimized.error) {
          notOptimized.add(name.substring(1));
        }
        totalInputSize += file.length;
        totalCompression += file.length - optimized.data.length;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.end(optimized.data);
        return;
      }
      throw new Error(`unknown path ${req.url}`);
    });
    await new Promise((resolve) => {
      // @ts-ignore
      server.listen(5000, resolve);
    });
    const list = (await filesPromise).filter((name) => name.endsWith('.svg'));
    const passed = await runTests(list);
    server.close();
    const end = process.hrtime.bigint();
    const diff = (end - start) / BigInt(1e6);

    if (passed) {
      console.info(`Regression tests successfully completed in ${diff}ms`);
    } else {
      console.error(colors.red(`Regression tests failed in ${diff}ms`));
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

program
  .option(
    '--preset <default | none>',
    'Specify which set of predefined plugins to use',
    'default',
  )
  .option(
    '--enable <plugin...>',
    'Specify one or more builtin plugins to run in addition to those in the preset or config',
  )
  .option(
    '--disable <plugin...>',
    'Specify one or more plugins from the preset or config which should not be run ',
  )
  .option('-l, --log', 'Write statistics log file to ./tmp directory')
  .option(
    '--inputdir <dir>',
    'Location of input files',
    './test/regression-fixtures',
  )
  .action(performTests);

program.parseAsync();
