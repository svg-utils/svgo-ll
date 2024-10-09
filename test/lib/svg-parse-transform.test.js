import { cssTransformToSVGAtt } from '../../lib/css-parse-decl.js';
import {
  svgAttTransformToCSS,
  svgParseTransform,
  svgStringifyTransform,
  svgToString,
} from '../../lib/svg-parse-att.js';

describe('test svg transform parsing', () => {
  /** @type {{in:string,out?:string}[]} */
  const testCases = [
    { in: 'rotate(31)' },
    { in: 'rotate(31 2 3)' },
    { in: 'translate(31)' },
    { in: 'translate(3 2)' },
    { in: 'translate(3 0)', out: 'translate(3)' },
    { in: 'scale(3 2)' },
    { in: 'scale(3)' },
    { in: 'scale(3 3)', out: 'scale(3)' },
    { in: 'matrix(1 2 3 4 5 6)' },
    { in: 'skewX(10)' },
    { in: 'skewY(10)' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const transforms = svgParseTransform(testCase.in);
      if (transforms === null) {
        throw new Error();
      }
      const expected = testCase.out ? testCase.out : testCase.in;
      expect(svgStringifyTransform(transforms)).toBe(expected);
    });
  }
});

describe('test transform conversion between attributes and properties', () => {
  /** @type {{in:string}[]} */
  const testCases = [
    { in: 'rotate(31)' },
    { in: 'rotate(31 2 3)' },
    { in: 'rotate(31 2 3)translate(2)' },
    { in: 'translate(31)' },
    { in: 'translate(31 3)' },
    { in: 'matrix(1 2 3 4 5 6)' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const css = svgAttTransformToCSS({ strVal: testCase.in });
      const att = cssTransformToSVGAtt(css);
      if (att === undefined) {
        throw new Error();
      }
      expect(svgToString(att)).toBe(testCase.in);
    });
  }
});
