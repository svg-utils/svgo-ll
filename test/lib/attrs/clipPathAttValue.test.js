import { ClipPathAttValue } from '../../../lib/attrs/clipPathAttValue.js';

describe('test toString()', () => {
  const tests = [{ in: 'url(#a)' }, { in: 'none' }];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = new ClipPathAttValue(test.in);
      expect(obj.toString()).toBe(test.in);
    });
  }
});
