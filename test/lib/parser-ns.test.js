import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SVGOError } from '../../lib/svgo/tools.js';
import { optimize } from '../../lib/svgo.js';

const testFileDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'namespaceData',
);

/**
 * @param {string} filename
 */
function getData(filename) {
  const input = fs.readFileSync(path.resolve(testFileDir, `${filename}.svg`), {
    encoding: 'utf8',
  });
  const expected = fs.readFileSync(
    path.resolve(testFileDir, `${filename}.expected.svg`),
    {
      encoding: 'utf8',
    },
  );
  let actual = input;
  try {
    actual = optimize(input, {
      pluginNames: ['cleanupTextNodes'],
      js2svg: { pretty: true },
    }).data;
  } catch (error) {
    if (!(error instanceof SVGOError)) {
      throw error;
    }
  }
  return {
    actual: actual,
    expected: expected,
  };
}

test('all non-xlink prefixes changed to xlink', () => {
  const data = getData('xlink.1');
  expect(data.actual).toBe(data.expected);
});

test('add xlink ns to top element not there', () => {
  const data = getData('xlink.2');
  expect(data.actual).toBe(data.expected);
});

test('add xlink ns to top element if already there', () => {
  const data = getData('xlink.3');
  expect(data.actual).toBe(data.expected);
});

test('fail if a default namespace other than SVG is declared - file should be unchanged', () => {
  const data = getData('xlink.4');
  expect(data.actual).toBe(data.expected);
});
