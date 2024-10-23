import { hasSignificantWhiteSpace } from '../../plugins/cleanupTextElements.js';

describe('test for significant whitespace', () => {
  /** @type {{in:string,out:boolean}[]} */
  const testCases = [
    { in: '', out: false },
    { in: ' \n\n\t', out: false },
    { in: ' x', out: true },
    { in: 'xxxx', out: false },
    { in: 'xx xx', out: false },
    { in: 'xx  xx', out: true },
    { in: 'xxxx\n', out: true },
  ];

  for (const testCase of testCases) {
    it(`${JSON.stringify(testCase.in)}`, () => {
      expect(hasSignificantWhiteSpace(testCase.in)).toBe(testCase.out);
    });
  }
});
