import { TransformValue } from '../../lib/attrs/transformValue.js';
import {
  svgParseTransform,
  svgStringifyTransform,
} from '../../lib/svg-parse-att.js';
import { createElement, createRoot } from '../../lib/xast.js';

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
  /** @type {{in:string,out?:string}[]} */
  const testCases = [
    { in: 'rotate(31)', out: 'rotate(31deg)' },
    { in: 'rotate(31 2 3)', out: 'rotate(31deg 2 3)' },
    {
      in: 'rotate(31 2 3)translate(2)',
      out: 'rotate(31deg 2 3)translate(2px)',
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
      const root = createRoot();
      const element = createElement(root, 'g', { transform: testCase.in });
      const attValue = TransformValue.getAttValue(element, 'transform');
      if (!attValue) {
        throw new Error();
      }
      expect(attValue.toStyleAttString()).toBe(testCase.out ?? testCase.in);
    });
  }
});
