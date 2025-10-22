import { parseStyleDeclarations } from '../../lib/css/css-tools.js';
import { parseStylesheet } from '../../lib/css/style-css-tree.js';

describe('test parsing of style attributes', function () {
  /** @type{{input:string,expected:Object<string,{value:string,important:boolean}>}[]} */
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
      input: 'marker:url(#a)',
      expected: {
        'marker-end': { value: `url(#a)`, important: false },
        'marker-mid': { value: `url(#a)`, important: false },
        'marker-start': { value: `url(#a)`, important: false },
      },
    },

    // test !important for all attribute types
    {
      input: ' ; fill: red  ; stroke : green   ;  ',
      expected: {
        fill: { value: 'red', important: false },
        stroke: { value: 'green', important: false },
      },
    },
    {
      input: 'fill-opacity:.1!important;',
      expected: {
        'fill-opacity': { value: '.1', important: true },
      },
    },
    {
      input: 'color:red!important;clip-path:url(#a)!important',
      expected: {
        color: { value: 'red', important: true },
        'clip-path': { value: 'url(#a)', important: true },
      },
    },
    {
      input: 'cx:20%!important;filter:url(#a)!important',
      expected: {
        cx: { value: '20%', important: true },
        filter: { value: 'url(#a)', important: true },
      },
    },
    {
      input: 'font-size:20%!important;transform:translate(0,0)!important',
      expected: {
        'font-size': { value: '20%', important: true },
        transform: { value: 'translate(0)', important: true },
      },
    },
    {
      input: 'height:20%!important;letter-spacing:2px!important',
      expected: {
        height: { value: '20%', important: true },
        'letter-spacing': { value: '2', important: true },
      },
    },
    {
      input: 'mask:url(#a)!important;marker-end:url(#a)!important',
      expected: {
        mask: { value: 'url(#a)', important: true },
        'marker-end': { value: 'url(#a)', important: true },
      },
    },
    {
      input: 'stroke-dasharray: 20%, 50%!important;x:2px!important',
      expected: {
        'stroke-dasharray': { value: '20%,50%', important: true },
        x: { value: '2', important: true },
      },
    },
  ];

  for (let index = 0; index < tests.length; index++) {
    const test = tests[index];
    it(`test ${test.input}`, function () {
      const parsed = parseStyleDeclarations(test.input);
      expect(parsed.count()).toBe(Object.keys(test.expected).length);
      for (const [prop, value] of Object.entries(test.expected)) {
        expect(parsed.get(prop)?.toStyleAttString()).toBe(value.value);
        expect(parsed.get(prop)?.isImportant()).toBe(value.important);
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
