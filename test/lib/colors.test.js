import { ColorValue } from '../../lib/color.js';

describe('test parsing and minifying', () => {
  /** @type {{in:string,minified?:string}[]} */
  const testCases = [
    { in: '#ffffff', minified: '#fff' },
    { in: '#aABBcc', minified: '#abc' },
    { in: '#F00', minified: 'red' },
    { in: 'cadetBlue', minified: '#5f9ea0' },
    { in: 'coRal', minified: 'coral' },
    { in: 'wHatEveR' },
  ];
  // TODO:
  // CASE SENSITIVITY
  // INVALID VALUES
  // alpha channel
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const attValue = ColorValue.getColorObj(testCase.in);
      expect(attValue.toString()).toBe(testCase.in);
      const minified = attValue.getMinifiedValue();
      expect(minified.toString()).toBe(testCase.minified ?? testCase.in);
    });
  }
});
