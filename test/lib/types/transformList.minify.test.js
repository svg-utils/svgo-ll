import { TransformList } from '../../../lib/types/transformList.js';

describe('test minification with transform attribute', () => {
  // TODO
  // rotate: handle units other than degrees
  // rotate: test wrap around 360 for merge
  // normalize angles to 0 <= a < 360
  // test case for all identify transforms
  // rotate: test case for merge -> identity
  // translate: test case for merge -> identity
  // don't merge translate with different units
  const tests = [
    { in: 'rotate(20)rotate(30)', out: 'rotate(50)' },
    { in: 'rotate(23)rotate(24 2 3)' },
    { in: 'rotate(0)', out: '' },
    { in: 'translate(2)rotate(0)translate(3)', out: 'translate(5)' },
    { in: 'translate(2)translate(-2)', out: '' },
  ];

  for (const test of tests) {
    it(test.in, () => {
      const tl = new TransformList(test.in);
      expect(tl.minify().toString()).toBe(test.out ?? test.in);
    });
  }
});
