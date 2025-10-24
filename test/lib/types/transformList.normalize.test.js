import { TransformList } from '../../../lib/types/transformList.js';

describe('test normalization', () => {
  // TODO
  // rotate: handle units other than degrees
  // rotate: test wrap around 360 for merge
  // test case for all identify transforms
  // rotate: test case for merge -> identity
  // translate: test case for merge -> identity
  // don't merge translate with different units
  // matrix: multiply adjacent
  const tests = [
    { in: 'rotate(20)rotate(30)', out: 'rotate(50)' },
    {
      in: 'rotate(23)rotate(24 2 3)',
      out: 'rotate(23)translate(2 3)rotate(24)translate(-2 -3)',
    },
    { in: 'rotate(0)', out: '' },
    { in: 'translate(2)rotate(0)translate(3)', out: 'translate(5)' },
    { in: 'translate(2)translate(-2)', out: '' },
    { in: 'scale(2)scale(3)', out: 'scale(6)' },
    { in: 'scale(2)scale(.5)', out: '' },
    { in: 'skewX(0)', out: '' },
    { in: 'skewY(0)', out: '' },
    { in: 'matrix(1 0 0 1 0 0)', out: '' },
    { in: 'rotate(360)', out: '' },
    { in: 'rotate(721)', out: 'rotate(1)' },
    { in: 'rotate(-1)', out: 'rotate(359)' },
    { in: 'rotate(-361)', out: 'rotate(359)' },
    { in: 'matrix(2.1 0 0 3 0 0)matrix(3 0 0 2.1 0 0)', out: 'scale(6.3)' },
    { in: 'matrix(2.1 0 0 3 0 0)', out: 'scale(2.1 3)' },
    { in: 'matrix(1 0 0 1 10 20)', out: 'translate(10 20)' },
    { in: 'rotate(180)', out: 'scale(-1)' },
    { in: 'scale(-1)rotate(180)', out: '' },
  ];

  for (const test of tests) {
    it(test.in, () => {
      const tl = new TransformList(test.in);
      expect(tl.normalize().toString()).toBe(test.out ?? test.in);
    });
  }
});
