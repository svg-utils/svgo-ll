import { TransformAttValue } from '../../lib/attrs/transformAttValue.js';
import { cssParseTransform } from '../../lib/css/css-parse-transform.js';

describe('test css transform parsing', () => {
  /** @type {{in:string;out?:string}[]} */
  const testCases = [
    { in: 'rotate(31deg)' },
    { in: 'translate(100px,20px)' },
    { in: 'translate(100px)' },
    { in: 'translate(100mm)' },
    { in: 'skewX(1.2deg)' },
    { in: 'skewY(1.2deg)' },
    { in: 'scale(2)' },
    { in: 'scale(2,3)' },
    { in: 'scale(3,3)', out: 'scale(3)' },
    { in: 'matrix(1,2,3,4,5,6)' },
    { in: 'rotate(.1turn)' },
    { in: 'translateX(100px)', out: 'translate(100px)' },
    { in: 'translateY(100px)', out: 'translate(0,100px)' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const transforms = cssParseTransform(testCase.in);
      if (transforms === null) {
        expect(testCase.out).toBeNull();
      } else {
        const expected = testCase.out ? testCase.out : testCase.in;
        const attVal = new TransformAttValue(transforms);
        expect(attVal.toStyleAttString()).toBe(expected);
      }
    });
  }
});
