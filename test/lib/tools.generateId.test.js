import { generateId } from '../../lib/svgo/tools.js';

/**
 * @typedef {{
 * input:number,
 * expected:string
 * }} TestInfo
 */

describe('generateId()', () => {
  /**
   * @type {TestInfo[]}
   */
  const testData = [
    { input: 1, expected: 'a' },
    { input: 52, expected: 'Z' },
    { input: 53, expected: 'a0' },
    { input: 54, expected: 'aa' },
    { input: 2808, expected: 'ZZ' },
    { input: 2809, expected: 'a00' },
  ];

  for (let index = 0; index < testData.length; index++) {
    const test = testData[index];
    it(`test ${test.input}`, function () {
      expect(generateId(test.input)).toEqual(test.expected);
    });
  }
});
