import { parseProperty } from '../../lib/css-props.js';
import { CSSSelector, CSSSelectorSequence } from '../../lib/css.js';
import { CSSRuleConcrete } from '../../lib/style-css-tree.js';

describe('test stringifying of properties for <style>', function () {
  /** @type {{
   * props:[string,string][]
   * expected:string
   * }[]} */
  const tests = [
    {
      props: [['font-size', '12']],
      expected: 'font-size:12px',
    },
    {
      props: [['letter-spacing', '12']],
      expected: 'letter-spacing:12px',
    },
    {
      props: [['opacity', '12']],
      expected: 'opacity:12',
    },
    {
      props: [['stroke-width', '12']],
      expected: 'stroke-width:12',
    },
  ];

  const sequences = [
    new CSSSelectorSequence(undefined, [
      { type: 'ClassSelector', name: 'class1' },
    ]),
  ];
  const selector = new CSSSelector(sequences);

  for (const test of tests) {
    it(`test ${test.props} }`, function () {
      /** @type {Map<string,import('../../lib/types.js').CSSPropertyValue>} */
      const declarations = new Map();
      for (const [name, value] of test.props) {
        declarations.set(name, {
          value: parseProperty(name, value),
          important: false,
        });
      }

      const rule = new CSSRuleConcrete(
        selector,
        [0, 0, 0],
        declarations,
        false,
      );

      expect(rule.getDeclarationString()).toBe(test.expected);
    });
  }
});
