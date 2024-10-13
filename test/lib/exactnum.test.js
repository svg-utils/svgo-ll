import { ExactNum } from '../../lib/exactnum.js';

describe('test minification', () => {
  /** @type {{in:string,digits:number,out:string}[]} */
  const testCases = [{ in: '.00004', digits: 4, out: '0' }];

  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const e = new ExactNum(testCase.in);
      e.setNumberOfDigits(testCase.digits);
      expect(e.getMinifiedString()).toBe(testCase.out);
    });
  }
});
