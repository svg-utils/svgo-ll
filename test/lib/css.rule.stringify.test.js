import { SvgAttMap } from '../../lib/ast/svgAttMap.js';
import { parseProperty } from '../../lib/css/css-props.js';
import { CSSSelector, CSSSelectorSequence } from '../../lib/css/css.js';
import { CSSRuleConcrete } from '../../lib/css/style-css-tree.js';

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
      const declarations = new SvgAttMap();
      for (const [name, value] of test.props) {
        declarations.set(name, parseProperty(name, value, false));
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
