import {
  cssParseTransform,
  cssStringifyTransform,
} from '../../lib/css-parse-decl.js';

describe('test css transform parsing', () => {
  /** @type {{in:string;out?:string|null}[]} */
  const testCases = [
    { in: 'rotate(31deg)' },
    { in: 'translate(100px,20px)' },
    { in: 'translate(100px)' },
    { in: 'translate(100mm)', out: null },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const transforms = cssParseTransform(testCase.in);
      if (transforms === null) {
        expect(testCase.out).toBeNull();
      } else {
        const expected = testCase.in;
        expect(cssStringifyTransform(transforms)).toBe(expected);
      }
    });
  }
});
