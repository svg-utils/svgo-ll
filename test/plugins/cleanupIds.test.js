import { replaceIdInAttributeValue } from '../../plugins/cleanupIds.js';

describe('test ID replacement in URLs', function () {
  const tests = [
    ['#a', 'a', 'b', '#b'],
    ['#a', 'a', 'ax', '#ax'],
    ['url(#a)', 'a', 'b', 'url(#b)'],
    ['url(#a)', 'a', 'ax', 'url(#ax)'],
    ['#渐变_1', '渐变_1', 'b', '#b'],
    ['#%E6%B8%90%E5%8F%98_1', '渐变_1', 'b', '#b'],
  ];

  for (let index = 0; index < tests.length; index++) {
    const test = tests[index];
    it(`test ${index}`, function () {
      expect(replaceIdInAttributeValue(test[0], test[1], test[2])).toBe(
        test[3],
      );
    });
  }
});
