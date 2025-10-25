import { TransformAttValue } from '../../../lib/attrs/transformAttValue.js';
import {
  svgParseTransform,
  svgStringifyTransform,
  SVGTransformParseError,
} from '../../../lib/types/svgTransforms.js';

describe('test svg transform parsing', () => {
  /** @type {{in:string,out?:string|null}[]} */
  const testCases = [
    { in: 'rotate(31)' },
    { in: 'rotate(31 2 3)', out: 'rotate(31 2 3)' },
    { in: 'translate(31)' },
    { in: 'translate(1 2 3)', out: null },
    { in: 'translate(31px)', out: null },
    { in: 'translate(3 2)' },
    { in: 'translate(3 0)', out: 'translate(3)' },
    { in: 'scale(3 2)' },
    { in: 'scale(3)' },
    { in: 'scale(3) scale(4)', out: 'scale(3)scale(4)' },
    { in: 'scale(3) ,  scale(4)', out: 'scale(3)scale(4)' },
    { in: 'scale(3),scale(4)', out: 'scale(3)scale(4)' },
    { in: 'scale(3),,scale(4)', out: null },
    { in: 'scale(3 3)', out: 'scale(3)' },
    { in: 'matrix(1 2 3 4 5 6)' },
    { in: 'skewX(10)' },
    { in: 'skewY(10)' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      let transforms;
      try {
        transforms = svgParseTransform(testCase.in);
      } catch (error) {
        expect(testCase.out).toBeNull();
        expect(error instanceof SVGTransformParseError).toBe(true);
      }
      if (transforms) {
        const expected =
          testCase.out !== undefined ? testCase.out : testCase.in;
        expect(svgStringifyTransform(transforms)).toBe(expected);
      }
    });
  }
});

describe('test transform conversion between attributes and properties', () => {
  /** @type {{in:string,out?:string}[]} */
  const testCases = [
    { in: 'rotate(31)', out: 'rotate(31deg)' },
    {
      in: 'rotate(31 2 3)',
      out: 'translate(2px,3px)rotate(31deg)translate(-2px,-3px)',
    },
    {
      in: 'rotate(31 2 3)translate(2)',
      out: 'translate(2px,3px)rotate(31deg)translate(-2px,-3px)translate(2px)',
    },
    { in: 'translate(31)', out: 'translate(31px)' },
    { in: 'translate(31 3)', out: 'translate(31px,3px)' },
    { in: 'matrix(1 2 3 4 5 6)', out: 'matrix(1,2,3,4,5,6)' },
    { in: 'skewX(31)', out: 'skewX(31deg)' },
    { in: 'skewY(31)', out: 'skewY(31deg)' },
    { in: 'scale(31)' },
    { in: 'scale(3 1)', out: 'scale(3,1)' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const attValue = new TransformAttValue(testCase.in);
      expect(attValue.toStyleAttString()).toBe(testCase.out ?? testCase.in);
    });
  }
});
