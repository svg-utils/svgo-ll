import { RawUrlAttValue } from '../../../lib/attrs/rawUrlAttValue.js';

describe('test getID()', () => {
  const tests = [
    { in: '#a', exp: 'a' },
    { in: '#%E5%BA%B7', exp: '康' },
    { in: 'http://whatever.com', exp: undefined },
  ];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = new RawUrlAttValue(test.in);
      expect(obj.getID()).toBe(test.exp);
    });
  }
});

describe('test getURL()', () => {
  const tests = [
    { in: '#a', exp: '#a' },
    { in: '#%E5%BA%B7', exp: '#康' },
    { in: 'http://whatever.com', exp: 'http://whatever.com' },
  ];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = new RawUrlAttValue(test.in);
      expect(obj.getURL()).toBe(test.exp);
    });
  }
});
