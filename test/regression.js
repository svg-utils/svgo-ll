import fs from 'node:fs/promises';
import http from 'http';
import os from 'os';
import path from 'path';
import colors from 'picocolors';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { fileURLToPath } from 'url';
import { optimize } from '../lib/svgo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const width = 960;
const height = 720;

/** @type {import('playwright').PageScreenshotOptions} */
const screenshotOptions = {
  omitBackground: true,
  clip: { x: 0, y: 0, width, height },
  animations: 'disabled',
};

/** @type {Object<string,{expectedMismatches:number,comment?:string}>}*/
const mismatchExceptions = {
  'svgs/oxygen-icons-5.113.0/scalable/actions/document-close.svg': {
    expectedMismatches: 2,
    comment: 'No mismatches when width/height removed.',
  },
  'svgs/oxygen-icons-5.113.0/scalable/actions/small/16x16/application-exit.svg':
    { expectedMismatches: 1 },
  'svgs/oxygen-icons-5.113.0/scalable/actions/small/16x16/view-media-playlist.svg':
    { expectedMismatches: 1 },
  'svgs/oxygen-icons-5.113.0/scalable/actions/small/22x22/view-time-schedule-calculus.svg':
    { expectedMismatches: 2 },
  'svgs/oxygen-icons-5.113.0/scalable/actions/small/48x48/preflight-verifier.svg':
    {
      expectedMismatches: 24,
      comment:
        'No visual difference; errors go away when width/height are removed.',
    },
  'svgs/oxygen-icons-5.113.0/scalable/categories/system-help.svg': {
    expectedMismatches: 9,
    comment: 'no visual difference with or without width/height',
  },
  'svgs/oxygen-icons-5.113.0/scalable/categories/small/22x22/system-help.svg': {
    expectedMismatches: 2,
    comment:
      'No visual difference with or without width/height. Without width/height, 33 pixel mismatches but still can not see the difference.',
  },
  'svgs/oxygen-icons-5.113.0/scalable/devices/hidef/media-flash-smart-media.svg':
    { expectedMismatches: 1, comment: 'works if width/height are removed' },
  'svgs/oxygen-icons-5.113.0/scalable/apps/small/16x16/preferences-desktop-user.svg':
    { expectedMismatches: 9 },
  'svgs/oxygen-icons-5.113.0/scalable/apps/small/32x32/preferences-desktop-user.svg':
    { expectedMismatches: 1 },
  'svgs/oxygen-icons-5.113.0/scalable/apps/preferences-desktop-user.svg': {
    expectedMismatches: 1,
  },
  'svgs/W3C_SVG_11_TestSuite/svg/filters-composite-02-b.svg': {
    expectedMismatches: 4,
    comment: 'No visual differences.',
  },
  'svgs/W3C_SVG_11_TestSuite/svg/filters-gauss-01-b.svg': {
    expectedMismatches: 4,
    comment: 'No visual differences.',
  },
};

/**
 * @param {string[]} list
 * @returns {Promise<boolean>}
 */
const runTests = async (list) => {
  let mismatched = 0;
  let passed = 0;
  console.info('Start browser…');
  /**
   * @param {import('playwright').Page} page
   * @param {string} name
   */
  const processFile = async (page, name) => {
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
    const exception = mismatchExceptions[name];
    if (exception) {
      if (mismatchCount === 0) {
        passed++;
        console.warn(
          colors.yellow(`${name} matches but is listed as exception`),
        );
      } else {
        if (exception.expectedMismatches === mismatchCount) {
          if (exception.comment) {
            console.info(
              colors.green(
                `${name} is in ignore list and has ${mismatchCount} pixel mismatches`,
              ),
            );
          } else {
            console.info(
              colors.cyan(
                `${name} is in ignore list and has ${mismatchCount} pixel mismatches and no comment`,
              ),
            );
          }
        } else {
          mismatched++;
          console.error(
            colors.red(
              `${name} is in ignore list with ${exception.expectedMismatches} expected pixel mismatches but got ${mismatchCount}`,
            ),
          );
        }
      }
    } else if (mismatchCount <= 0) {
      passed++;
    } else {
      if (mismatchCount === 1) {
        console.info(
          colors.cyan(
            `${name} is not in ignore list but has only 1 pixel mismatch`,
          ),
        );
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
  console.info(`Passed: ${passed}`);
  return mismatched === 0;
};

(async () => {
  try {
    const start = process.hrtime.bigint();
    const fixturesDir = path.join(__dirname, 'regression-fixtures');
    const filesPromise = fs.readdir(fixturesDir, { recursive: true });
    const server = http.createServer(async (req, res) => {
      if (req.url === undefined) {
        throw new Error();
      }
      const name = req.url.slice(req.url.indexOf('/', 1));
      let file;
      try {
        file = await fs.readFile(path.join(fixturesDir, name), 'utf-8');
      } catch {
        res.statusCode = 404;
        res.end();
        return;
      }

      if (req.url.startsWith('/original/')) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.end(file);
        return;
      }
      if (req.url.startsWith('/optimized/')) {
        /** @type {import('../lib/svgo.js').Config} */
        const config = {};
        config.plugins = [
          {
            name: 'preset-default',
            params: {
              overrides: {
                // convertShapeToPath causes a number of false positives
                convertShapeToPath: false,
              },
            },
          },
        ];

        const optimized = optimize(file, config);
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
})();
