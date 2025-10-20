import { FilterAttValue } from '../../../lib/attrs/filterAttValue.js';

describe('test toString()', () => {
  const tests = [{ in: 'url(#a)' }, { in: 'none' }];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = new FilterAttValue(test.in);
      expect(obj.toString()).toBe(test.in);
    });
  }
});
