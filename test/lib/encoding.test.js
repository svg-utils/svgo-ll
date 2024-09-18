import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSvg } from '../../lib/parser.js';
import { stringifySvg } from '../../lib/stringifier.js';

const testFileDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'encodingData',
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

test('only "&" and "<" should be encoded in text', () => {
  const data = getData('encoding.1');
  expect(data.actual).toBe(data.expected);
});
