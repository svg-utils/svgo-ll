import { cssParseTransform } from '../../../lib/css/css-parse-transform.js';
import { TransformList } from '../../../lib/types/transformList.js';

describe('test normalization of attributes', () => {
  // TODO
  // matrix: multiply adjacent
  const tests = [
    { in: 'rotate(20)rotate(30)', out: 'rotate(50)' },
    { in: 'rotate(20)rotate(390)', out: 'rotate(50)' },
    { in: 'rotate(20)rotate(340)', out: '' },
    {
      in: 'rotate(24 2 3)rotate(23)',
      out: 'rotate(24 2 3)rotate(23)',
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
    { in: 'matrix(0 1 -1 0 0 0)', out: 'rotate(90)' },
    { in: 'matrix(0 -1 1 0 0 0)', out: 'rotate(270)' },
    { in: 'matrix(1 0 1 1 0 0)', out: 'skewX(45)' },
    { in: 'matrix(1 1 0 1 0 0)', out: 'skewY(45)' },
    {
      in: 'translate(2 3)rotate(24)translate(-2 -3)',
      out: 'rotate(24 2 3)',
    },
    {
      in: 'matrix(1 1 0 1 0 1)matrix(1 1 0 2 0 0)',
      out: 'matrix(1 1 0 1 0 0)',
    },
  ];

  for (const test of tests) {
    it(test.in, () => {
      const tl = new TransformList(test.in);
      expect(tl.normalize().toString()).toBe(test.out ?? test.in);
    });
  }
});

describe('test normalization of properties', () => {
  const tests = [
    { in: 'rotate(20deg)rotate(30deg)', out: 'rotate(50deg)' },
    { in: 'rotate(20turn)rotate(30turn)', out: 'rotate(50turn)' },
    { in: 'rotate(20deg)rotate(30turn)' },
    { in: 'translate(2em,3em)translate(4em,5em)', out: 'translate(6em,8em)' },
    { in: 'translate(2em,3em)translate(4em,5px)' },
  ];

  for (const test of tests) {
    it(test.in, () => {
      const tl = new TransformList(cssParseTransform(test.in));
      expect(tl.normalize().toStyleAttString()).toBe(test.out ?? test.in);
    });
  }
});
