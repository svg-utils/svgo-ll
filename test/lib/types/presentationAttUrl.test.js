import { PresentationAttUrl } from '../../../lib/types/presentationAttUrl.js';

describe('test getID()', () => {
  const tests = [
    { in: 'url(#a)', exp: 'a' },
    { in: 'url(#%E5%BA%B7)', exp: '康' },
    { in: 'url(http://whatever.com)', exp: undefined },
  ];

  for (const test of tests) {
    it(`${test.in}`, () => {
      const obj = new PresentationAttUrl(test.in);
      expect(obj.getReferencedID()).toBe(test.exp);
    });
  }
});
