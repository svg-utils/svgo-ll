import { cssParseTransform } from '../../../lib/css/css-parse-transform.js';
import { TransformList } from '../../../lib/types/transformList.js';

describe('test finding shortest attribute variant', () => {
  const tests = [
    { in: 'translate(2 3)scale(4 5)', out: 'matrix(4 0 0 5 2 3)' },
    {
      in: 'translate(30 60)scale(8)translate(-1 -1)',
      out: 'matrix(8 0 0 8 22 52)',
    },
    {
      in: 'translate(-42.29387 40.47345)scale(-.03775098 .04880038)translate(-2887.653 -1524.907)scale(-1.277147 1.536384)',
      out: 'matrix(-.03775098 0 0 .04880038 66.71786064994 -33.94259106466)scale(-1.277147 1.536384)',
    },
    {
      in: 'translate(180 280)rotate(90)scale(1.6)translate(-5 -5)',
      out: 'matrix(0 1.6 -1.6 0 188 272)',
    },
    {
      in: 'translate(-2.8342546 33.708578)scale(1.0417865 .9765718)',
      out: 'matrix(1.0417865 0 0 .9765718 -2.8342546 33.708578)',
    },
    {
      in: 'translate(-2.8342546 33.708578)scale(1.0417865 .9765718)translate(-21.67909 -67.880417)scale(.2216259 .2254747)',
      out: 'matrix(1.0417865 0 0 .9765718 -2.8342546 33.708578)matrix(.2216259 0 0 .2254747 -21.67909 -67.880417)',
    },
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
      out: 'matrix(.63851859,0,0,.61562608,237.9233,102.57086)',
    },
    {
      in: 'translate(237.9233em,102.57086px)scale(.63851859,.61562608)',
      out: 'translate(237.9233em,102.57086px)scale(.63851859,.61562608)',
    },
  ];

  for (const test of tests) {
    it(test.in, () => {
      const t = new TransformList(cssParseTransform(test.in));
      expect(t.findShortestProperty().toStyleAttString()).toBe(
        test.out ?? test.in,
      );
    });
  }
});
