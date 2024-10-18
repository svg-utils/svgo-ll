import { StopOffsetValue } from '../../lib/stop-offset.js';

describe('test parsing and minifying', () => {
  /** @type {{in:string,minified?:string}[]} */
  const testCases = [
    { in: '0%', minified: '0' },
    { in: '.01', minified: '1%' },
    { in: '.011', minified: '.011' },
    { in: '2%', minified: '2%' },
    { in: '.09', minified: '9%' },
    { in: '.12', minified: '.12' },
    { in: '100%', minified: '1' },
    { in: '41%', minified: '.41' },
    { in: '41.1%', minified: '.411' },
    { in: 'xx', minified: 'xx' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const attValue = StopOffsetValue.getStopOffsetObj(testCase.in);
      expect(attValue.toString()).toBe(testCase.in);
      const minified = attValue.getMinifiedValue();
      expect(minified.toString()).toBe(testCase.minified ?? testCase.in);
    });
  }
});
