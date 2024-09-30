import { CSSRule, CSSSelector, CSSSelectorSequence } from '../../lib/css.js';
import { createElement } from './testutils.js';

/**
 * @typedef {import('../../lib/css.js').SimpleSelector} SimpleSelector
 */

describe('test parsing and stringifying of selectors', function () {
  /** @type {{
   * selectorInfo:SimpleSelector[],
   * elData:{elName:string,atts:[string,string][]},
   * expected:boolean|null
   * }[]} */
  const tests = [
    {
      selectorInfo: [{ type: 'ClassSelector', name: 'class1' }],
      elData: { elName: 'path', atts: [] },
      expected: false,
    },
    {
      selectorInfo: [{ type: 'ClassSelector', name: 'class1' }],
      elData: { elName: 'path', atts: [['class', 'class2']] },
      expected: false,
    },
    {
      selectorInfo: [{ type: 'ClassSelector', name: 'class1' }],
      elData: { elName: 'path', atts: [['class', 'class1']] },
      expected: true,
    },
    {
      selectorInfo: [
        { type: 'ClassSelector', name: 'class1' },
        { type: 'IdSelector', name: 'id1' },
      ],
      elData: { elName: 'path', atts: [['class', 'class1']] },
      expected: null,
    },
    {
      selectorInfo: [{ type: 'IdSelector', name: 'id1' }],
      elData: { elName: 'path', atts: [] },
      expected: false,
    },
    {
      selectorInfo: [{ type: 'IdSelector', name: 'id1' }],
      elData: { elName: 'path', atts: [['id', 'id1']] },
      expected: true,
    },
    {
      selectorInfo: [{ type: 'IdSelector', name: 'id1' }],
      elData: { elName: 'path', atts: [['id', 'class1']] },
      expected: false,
    },
    {
      selectorInfo: [{ type: 'TypeSelector', name: 'path' }],
      elData: { elName: 'path', atts: [] },
      expected: true,
    },
    {
      selectorInfo: [{ type: 'TypeSelector', name: 'path' }],
      elData: { elName: 'circle', atts: [] },
      expected: false,
    },
  ];
  const declarations = new Map();

  for (const test of tests) {
    const sequences = [new CSSSelectorSequence(undefined, test.selectorInfo)];
    const selector = new CSSSelector(sequences);
    it(`test ${selector.getString()}`, function () {
      const rule = new CSSRule(selector, [0, 0, 0], declarations, false);
      const element = createElement(test.elData);
      expect(rule._matches(element)).toBe(test.expected);
    });
  }
});
