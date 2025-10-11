import { UrlAttValue } from '../../../lib/attrs/urlAttValue.js';

describe('test getID()', () => {
  const tests = [
    { in: 'url(#a)', exp: 'a' },
    { in: 'url(#%E5%BA%B7)', exp: '康' },
    { in: 'url(http://whatever.com)', exp: undefined },
  ];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = new UrlAttValue(test.in);
      expect(obj.getID()).toBe(test.exp);
    });
  }
});

describe('test getURL()', () => {
  const tests = [
    { in: 'url(#a)', exp: '#a' },
    { in: 'url(#%E5%BA%B7)', exp: '#康' },
    { in: 'url(http://whatever.com)', exp: 'http://whatever.com' },
  ];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = new UrlAttValue(test.in);
      expect(obj.getURL()).toBe(test.exp);
    });
  }
});
