import { MaskAttValue } from '../../../lib/attrs/maskAttValue.js';

describe('test toString()', () => {
  const tests = [{ in: 'url(#a)' }, { in: 'none' }];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = new MaskAttValue(test.in);
      expect(obj.toString()).toBe(test.in);
    });
  }
});
