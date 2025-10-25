import { TransformAttValue } from '../../lib/attrs/transformAttValue.js';
import {
  cssParseTransform,
  CSSTransformParseError,
} from '../../lib/css/css-parse-transform.js';
import { TransformList } from '../../lib/types/transformList.js';

describe('test css transform parsing', () => {
  /** @type {{in:string;out?:string|null}[]} */
  const testCases = [
    { in: 'rotate(31deg)' },
    { in: 'translate(100px,20px)' },
    { in: 'translate(100px)' },
    { in: 'translate(100mm)' },
    { in: 'skewX(1.2deg)' },
    { in: 'skewY(1.2deg)' },
    { in: 'scale(2)' },
    { in: 'scale(2)scale(3)' },
    { in: 'scale(2)  scale(3)', out: 'scale(2)scale(3)' },
    // Don't allow comma separated function in CSS.
    { in: 'scale(2),scale(3)', out: null },
    { in: 'scale(2,3)' },
    { in: 'scale(3,3)', out: 'scale(3)' },
    { in: 'matrix(1,2,3,4,5,6)' },
    { in: 'rotate(.1turn)' },
    { in: 'translateX(100px)', out: 'translate(100px)' },
    { in: 'translateY(100px)', out: 'translate(0,100px)' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      let transforms;
      try {
        transforms = cssParseTransform(testCase.in);
      } catch (error) {
        expect(testCase.out).toBeNull();
        expect(error instanceof CSSTransformParseError).toBe(true);
      }

      if (transforms) {
        const expected = testCase.out ? testCase.out : testCase.in;
        const attVal = new TransformAttValue(new TransformList(transforms));
        expect(attVal.toStyleAttString()).toBe(expected);
      }
    });
  }
});
