import { isNumber } from '../../lib/svgo/tools.js';

/**
 * @typedef {{
 * input:string,
 * expected:boolean
 * }} TestInfo
 */

describe('isNumber()', () => {
  /**
   * @type {TestInfo[]}
   */
  const testData = [
    { input: '1', expected: true },
    { input: '-1', expected: true },
    { input: '+1', expected: true },
    { input: '- 1', expected: false },
    { input: '.1', expected: true },
    { input: '0.123', expected: true },
    { input: '.', expected: false },
    { input: '', expected: false },
    { input: ' 1 ', expected: true },
    { input: '.13e-6', expected: true },
    { input: '.13e', expected: false },
    { input: 'xx', expected: false },
  ];

  for (let index = 0; index < testData.length; index++) {
    const test = testData[index];
    it(`test "${test.input}"`, function () {
      expect(isNumber(test.input)).toEqual(test.expected);
    });
  }
});
