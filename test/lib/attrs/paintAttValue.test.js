import { PaintAttValue } from '../../../lib/attrs/paintAttValue.js';

describe('test getURL()', () => {
  const tests = [
    { in: 'url(#a)', exp: true },
    { in: 'url(#a) blue', exp: true },
    { in: 'yellow', exp: false },
  ];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = PaintAttValue.getObj(test.in);
      if (test.exp) {
        expect(obj.getURL()).toBeDefined();
      } else {
        expect(obj.getURL()).toBeUndefined();
      }
    });
  }
});

describe('test toString()', () => {
  const tests = [{ in: 'url(#a)' }, { in: 'url(#a) blue' }, { in: 'yellow' }];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = PaintAttValue.getObj(test.in);
      expect(obj.toString()).toBe(test.in);
    });
  }
});

describe('test getMinifiedValue()', () => {
  const tests = [
    { in: 'url(#a) #f00', out: 'url(#a) red' },
    { in: 'yellow', out: '#ff0' },
  ];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = PaintAttValue.getObj(test.in).getMinifiedValue();
      expect(obj.toString()).toBe(test.out ?? test.in);
    });
  }
});
