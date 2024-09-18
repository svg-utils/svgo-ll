import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSvg } from '../../lib/parser.js';
import { stringifySvg } from '../../lib/stringifier.js';

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
  const parsed = parseSvg(input);
  return {
    actual: stringifySvg(parsed, { pretty: true }),
    expected: expected,
  };
}

test('explicit svg namespace with no default', () => {
  const data = getData('no-default-ns');
  expect(data.actual).toBe(data.expected);
});

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
