import { parseStyleDeclarations } from '../../lib/css.js';

describe('test parsing of style attributes', function () {
  const tests = [
    {
      input: 'fill:red;stroke:green',
      expected: { fill: 'red', stroke: 'green' },
    },
    {
      input: ' ; fill: red  ; stroke : green   ;  ',
      expected: { fill: 'red', stroke: 'green' },
    },
    {
      input: 'mask: url(masks.svg#star) stroke-box;',
      expected: { mask: 'url(masks.svg#star) stroke-box' },
    },
    {
      input: 'mask: url(http://localhost//test.svg?x=1;y=2#mask1) stroke-box;',
      expected: {
        mask: 'url(http://localhost//test.svg?x=1;y=2#mask1) stroke-box',
      },
    },
    {
      input:
        'mask: url(http://localhost//test.svg?x=1;y=2#mask1) stroke-box;fill:red ',
      expected: {
        mask: 'url(http://localhost//test.svg?x=1;y=2#mask1) stroke-box',
        fill: 'red',
      },
    },
  ];

  for (let index = 0; index < tests.length; index++) {
    const test = tests[index];
    it(`test ${index}`, function () {
      const parsed = parseStyleDeclarations(test.input);
      expect(parsed.size).toBe(Object.keys(test.expected).length);
      for (const [prop, value] of Object.entries(test.expected)) {
        expect(parsed.get(prop)).toBe(value);
      }
    });
  }
});
