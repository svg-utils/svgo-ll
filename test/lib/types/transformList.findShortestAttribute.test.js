import { TransformList } from '../../../lib/types/transformList.js';

describe('test finding shortest variant', () => {
  const tests = [
    { in: 'translate(2 3)scale(4 5)', out: 'matrix(4 0 0 5 2 3)' },
  ];

  for (const test of tests) {
    it(test.in, () => {
      const tl = new TransformList(test.in);
      expect(tl.findShortestAttribute().toString()).toBe(test.out ?? test.in);
    });
  }
});
