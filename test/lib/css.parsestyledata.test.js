import { parseStyleDeclarations } from '../../lib/css-tools.js';
import { parseStylesheet } from '../../lib/style-css-tree.js';

describe('test parsing of style attributes', function () {
  /** @type{{input:string,expected:Object<string,import('../../lib/types.js').CSSPropertyValue>}[]
  } */
  const tests = [
    {
      input: 'fill:red;stroke:green',
      expected: {
        fill: { value: 'red', important: false },
        stroke: { value: 'green', important: false },
      },
    },
    {
      input: 'fill:red!important;stroke:green',
      expected: {
        fill: { value: 'red', important: true },
        stroke: { value: 'green', important: false },
      },
    },
    {
      input: ' ; fill: red  ; stroke : green   ;  ',
      expected: {
        fill: { value: 'red', important: false },
        stroke: { value: 'green', important: false },
      },
    },
  ];

  for (let index = 0; index < tests.length; index++) {
    const test = tests[index];
    it(`test ${test.input}`, function () {
      const parsed = parseStyleDeclarations(test.input);
      expect(parsed.size).toBe(Object.keys(test.expected).length);
      for (const [prop, value] of Object.entries(test.expected)) {
        expect(parsed.get(prop)?.value.toString()).toBe(value.value);
        expect(parsed.get(prop)?.important).toBe(value.important);
      }
    });
  }
});

describe('test parsing and stringifying of selectors', function () {
  const tests = [
    // Attribute selectors.
    { input: '[x]' },
    { input: 'a[href="https://example.org"]' },
    { input: 'a[href*="example"]' },
    { input: 'a[href*="cAsE"s]' },
    // Classes.
    { input: '.a' },
    // Pseudo-classes.
    { input: ':hover' },
    { input: 'path:hover' },
    // Pseudo-elements.
    { input: 'tspan::first-letter' },
    // Combinators.
    { input: '[stroke]+path' },
    { input: 'ul.my-things>li' },
    { input: 'ul.my-things li' },
    { input: ':lang(en)' },
    { input: '::part(foo)' },
  ];

  for (let index = 0; index < tests.length; index++) {
    const test = tests[index];
    it(`test ${test.input}`, function () {
      const ruleSets = parseStylesheet(`${test.input}{fill:blue}`);
      const rule = ruleSets[0].getRules()[0];
      expect(rule.getSelectorString()).toBe(test.input);
    });
  }
});
