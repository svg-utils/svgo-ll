import { ViewBoxAttValue } from '../../lib/attrs/viewBoxAttValue.js';

describe('test parsing and minifying', () => {
  /** @type {{in:string,out:string}[]} */
  const testCases = [{ in: '-0.9 -0.8,  20  , 20', out: '-.9 -.8 20 20' }];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const attValue = new ViewBoxAttValue(testCase.in);
      expect(attValue.toString()).toBe(testCase.out);
    });
  }
});
