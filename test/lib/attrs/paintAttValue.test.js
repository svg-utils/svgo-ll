import { PaintAttValue } from '../../../lib/attrs/paintAttValue.js';

describe('test getURL()', () => {
  const tests = [
    { in: 'url(#a)', exp: true },
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
