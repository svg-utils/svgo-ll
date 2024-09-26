import {
  parsePathCommands,
  stringifyPathCommands,
} from '../../plugins/minifyPathAttr.js';

describe('test parsing of path', function () {
  /** @type {{input:string,expected?:string}[]} */
  // TODO:
  // DECIMALS
  // NEGATIVES
  // EXPONENTS
  // moves with implicit lines
  // SPACE BEFORE FIRST COMMAND
  const tests = [
    { input: 'm 2 2 h10', expected: 'm2 2h10' },
    { input: 'm2 2h10' },
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
