import { getNumberOfDecimalDigits } from '../../lib/svgo/tools.js';

/**
 * @typedef {{
 * input:string,
 * expected:number
 * }} TestInfo
 */

describe('getNumberOfDecimalDigits()', () => {
  /**
   * @type {TestInfo[]}
   */
  const testData = [
    { input: '0', expected: 0 },
    { input: '1.2', expected: 1 },
    { input: '1.20', expected: 1 },
    { input: '1.00', expected: 0 },
    { input: '1.', expected: 0 },
  ];

  for (let index = 0; index < testData.length; index++) {
    const test = testData[index];
    it(`test ${test.input}`, function () {
      expect(getNumberOfDecimalDigits(test.input)).toEqual(test.expected);
    });
  }
});
