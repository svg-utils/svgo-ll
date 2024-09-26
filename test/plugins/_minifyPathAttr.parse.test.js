import {
  parsePathCommands,
  stringifyPathCommands,
} from '../../plugins/minifyPathAttr.js';

describe('test parsing of path', function () {
  /** @type {{input:string,expected?:string}[]} */
  // TODO:
  // moves with implicit lines - implicit line start with .123, previous arg had decimal or exponent
  // validate number of args
  const tests = [
    { input: 'm 2 2 h10', expected: 'm2 2h10' },
    { input: 'm2 2h10' },
    // comma
    { input: 'm2,3h5', expected: 'm2 3h5' },
    // decimals
    { input: 'm2.3.4h10' },
    // exponent
    { input: 'm2 3h40e-1' },
    // negative
    { input: 'm2.3.4h-1' },
    // positive
    { input: 'm+2.3.4h-1', expected: 'm2.3.4h-1' },
    // implicit lines
    { input: 'm2,3 4 5', expected: 'm2 3l4 5' },
    { input: 'm4 3-1 5' },
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
