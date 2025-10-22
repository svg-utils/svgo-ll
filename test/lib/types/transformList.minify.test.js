import { TransformList } from '../../../lib/types/transformList.js';

describe('test minification with transform attribute', () => {
  // TODO
  // handle units other than degrees
  // don't merge if tx or ty
  // test wrap around 360
  const tests = [{ in: 'rotate(20)rotate(30)', out: 'rotate(50)' }];

  for (const test of tests) {
    it(test.in, () => {
      const tl = new TransformList(test.in);
      expect(tl.minify().toString()).toBe(test.out);
    });
  }
});
