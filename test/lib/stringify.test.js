import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSvg } from '../../lib/parser.js';
import { stringifySvg } from '../../lib/stringifier.js';
import { SVGOError } from '../../lib/svgo/tools.js';

const testFileDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'stringifyData',
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
    const parsed = parseSvg(input);
    actual = stringifySvg(parsed, { pretty: true });
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

test('non-self-closing tag in foreignObject', () => {
  const data = getData('foreign-non-self-closing');
  expect(data.actual).toBe(data.expected);
});
test('self-closing tag in foreignObject', () => {
  const data = getData('foreign-self-closing');
  expect(data.actual).toBe(data.expected);
});
