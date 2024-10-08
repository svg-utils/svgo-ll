import {
  parseCSSTransform,
  stringifyCSSTransform,
} from '../../lib/css-parse-decl.js';

describe('test css transform parsing', () => {
  /** @type {{in:string}[]} */
  const testCases = [{ in: 'rotate(31deg)' }];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const transforms = parseCSSTransform(testCase.in);
      if (transforms === null) {
        throw new Error();
      }
      const expected = testCase.in;
      expect(stringifyCSSTransform(transforms)).toBe(expected);
    });
  }
});
