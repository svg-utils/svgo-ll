import { LengthOrPctValue } from '../../lib/lengthOrPct.js';

describe('test parsing and minifying', () => {
  /** @type {{in:string,minified?:string}[]} */
  const testCases = [
    { in: '.12', minified: '.12px' },
    { in: '.12px', minified: '.12px' },
    { in: '0.90em', minified: '.9em' },
    { in: 'xx', minified: 'xx' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const attValue = LengthOrPctValue.getLengthOrPctObj(testCase.in);
      const minified = attValue.getMinifiedValue();
      expect(minified.toString()).toBe(testCase.minified ?? testCase);
    });
  }
});
