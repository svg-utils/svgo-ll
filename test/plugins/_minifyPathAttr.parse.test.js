import {
  parsePathCommands,
  stringifyPathCommands,
} from '../../plugins/minifyPathAttr.js';

describe('test parsing of path', function () {
  /** @type {{input:string,expected?:string}[]} */
  // TODO:
  // implicit params for h, v, etc.
  const tests = [
    { input: 'm 2 2 h10', expected: 'm2 2h10' },
    { input: 'm2 2h10' },
    // comma
    { input: 'm2,3h5', expected: 'm2 3h5' },
    // decimals
    { input: 'm2.3.4h10' },
    // exponent
    { input: 'm2 3h40e-1', expected: 'm2 3h4' },
    // negative
    { input: 'm2.3.4h-1' },
    // positive
    { input: 'm+2.3.4h-1', expected: 'm2.3.4h-1' },
    // M
    { input: 'M4 3h10' },
    { input: 'M4 3-2-3' },
    { input: 'M4 3h10.0', expected: 'M4 3h10' },
    { input: 'M-3-4h10' },
    // implicit lines
    { input: 'm2,3 4 5', expected: 'm2 3l4 5' },
    { input: 'm4 3-1 5' },
    { input: 'm4,3l-1 5 6 10', expected: 'm4 3-1 5l6 10' },
    { input: 'm4 3h10h5' },
    // cubic beziers
    {
      input: 'M 10,90C 30,90 25,10 50,10S 70,90 90,90',
      expected: 'M10 90C30 90 25 10 50 10S70 90 90 90',
    },
    // quadratic beziers
    {
      input: 'M 10,50Q 25,25 40,50t 30,0 30,0 30,0 30,0 30,0',
      expected: 'M10 50Q25 25 40 50t30 0 30 0 30 0 30 0 30 0',
    },
  ];

  for (const test of tests) {
    it(test.input, function () {
      const parsed = parsePathCommands(test.input);
      const s = stringifyPathCommands(parsed);
      const expected = test.expected ?? test.input;
      expect(s).toBe(expected);
    });
  }
});
