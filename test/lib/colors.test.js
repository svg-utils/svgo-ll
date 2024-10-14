import { ColorValue } from '../../lib/color.js';

describe('test parsing and minifying', () => {
  /** @type {{in:string,minified?:string}[]} */
  const testCases = [
    { in: '#ffffff', minified: '#fff' },
    { in: '#aABBcc', minified: '#abc' },
    { in: '#F00', minified: 'red' },
    { in: 'cadetBlue', minified: '#5f9ea0' },
    { in: 'coRal', minified: 'coral' },
    { in: 'wHatEveR' },
    { in: 'rGb( 50   100 ,   150 )', minified: '#326496' },
    { in: 'rgb(203,0,254)', minified: '#cb00fe' },
    { in: 'rgb( 49.5%, 33.49% ,22.5% )', minified: 'rgb(49.5%,33.49%,22.5%)' },
    { in: 'rgb(165,42,42)', minified: 'brown' },
    { in: 'rgb( 50 100 150 /.1)', minified: 'rgb( 50 100 150 /.1)' },
    { in: 'rgb(100%,0%,0%)', minified: 'red' },
    { in: 'rgb(100%,100%,100%)', minified: '#fff' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const attValue = ColorValue.getColorObj(testCase.in);
      expect(attValue.toString()).toBe(testCase.in);
      const minified = attValue.getMinifiedValue();
      expect(minified.toString()).toBe(testCase.minified ?? testCase.in);
    });
  }
});
