import { LengthOrPctValue } from '../../lib/attrs/lengthOrPct.js';

describe('test parsing and minifying', () => {
  /** @type {{in:string,minified?:string}[]} */
  const testCases = [
    { in: '.12', minified: '.12' },
    { in: '.12px', minified: '.12' },
    { in: '0.90em', minified: '.9em' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const attValue = LengthOrPctValue.getLengthOrPctObj(testCase.in);
      expect(attValue.toString()).toBe(testCase.minified);
    });
  }
});
