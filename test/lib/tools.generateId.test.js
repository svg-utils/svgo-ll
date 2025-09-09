import { generateId } from '../../lib/svgo/tools.js';

/**
 * @typedef {{
 * input:number,
 * expected:string
 * }} TestInfo
 */

describe('generateId()', () => {
  /** @type {TestInfo[]} */
  const testData = [
    { input: 0, expected: 'a' },
    { input: 51, expected: 'Z' },
    { input: 52, expected: 'aa' },
    { input: 53, expected: 'ab' },
    { input: 3285, expected: 'Z9' },
    { input: 3286, expected: 'aaa' },
  ];

  for (let index = 0; index < testData.length; index++) {
    const test = testData[index];
    it(`test ${test.input}`, function () {
      expect(generateId(test.input)).toEqual(test.expected);
    });
  }
});
