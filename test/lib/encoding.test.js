import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { optimize } from '../../lib/svgo.js';

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

  return {
    actual: optimize(input, {
      pluginNames: ['cleanupTextNodes'],
      js2svg: { pretty: true },
    }).data,
    expected: expected,
  };
}

test('only "&" and "<" should be encoded in text', () => {
  const data = getData('encoding.1');
  expect(data.actual).toBe(data.expected);
});
