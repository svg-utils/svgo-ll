import { cssParseTransform } from '../../../lib/css/css-parse-transform.js';
import { TransformList } from '../../../lib/types/transformList.js';

describe('test finding shortest attribute variant', () => {
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

describe('test finding shortest style property variant', () => {
  const tests = [
    {
      in: 'translate(237.9233px,102.57086px)scale(.63851859,.61562608)',
      out: 'matrix(.63851859 0 0 .61562608 237.9233 102.57086)',
    },
  ];

  for (const test of tests) {
    it(test.in, () => {
      const t = new TransformList(cssParseTransform(test.in));
      expect(t.findShortestProperty().toString()).toBe(test.out ?? test.in);
    });
  }
});
