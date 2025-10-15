import { Color } from '../../../lib/types/color.js';

describe('test parsing', () => {
  /** @type {{in:string,str?:string}[]} */
  const testCases = [
    { in: '#ffffff' },
    { in: 'rGb( 50   100 ,   150 )', str: 'rgb(50,100,150)' },
    { in: 'coRal', str: 'coral' },
    { in: 'rgb( 49.5%, 33.49% ,22.5% )', str: 'rgb(49.5%,33.49%,22.5%)' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const color = Color.parse(testCase.in);
      expect(color.toString()).toBe(testCase.str ?? testCase.in);
    });
  }
});

describe('test minifying', () => {
  /** @type {{in:string,minified?:string}[]} */
  const testCases = [
    { in: '#ffffff', minified: '#fff' },
    { in: '#aABBcc', minified: '#abc' },
    { in: '#F00', minified: 'red' },
    { in: 'cadetBlue', minified: '#5f9ea0' },
    { in: 'coRal', minified: 'coral' },
    { in: 'rGb( 50   100 ,   150 )', minified: '#326496' },
    { in: 'rgb(203,0,254)', minified: '#cb00fe' },
    {
      in: 'rgb( 49.5%, 33.49% ,22.5% )',
      minified: 'rgb(49.5%,33.49%,22.5%)',
    },
    { in: 'rgb(165,42,42)', minified: 'brown' },
    { in: 'rgb(100%,0%,0%)', minified: 'red' },
    { in: 'rgb(100%,100%,100%)', minified: '#fff' },
  ];
  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const color = Color.parse(testCase.in);
      const minified = color.getMinifiedValue();
      expect(minified.toString()).toBe(testCase.minified ?? testCase.in);
    });
  }
});
