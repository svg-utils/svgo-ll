import { StrokeDasharrayValue } from '../../lib/attrs/strokeDashArrayValue.js';

describe('test parsing and minifying', () => {
  /** @type {{in:string,out:string}[]} */
  const testCases = [
    { in: '0.8 0.9%', out: '.8 .9%' },
    { in: '  0.8   0.9%  ', out: '.8 .9%' },
    { in: '  0.8 ,  0.9%  ', out: '.8 .9%' },
    { in: '  0.8,0.9%  ', out: '.8 .9%' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const attValue = StrokeDasharrayValue.getObj(testCase.in);
      expect(attValue.toString()).toBe(testCase.out);
    });
  }
});
