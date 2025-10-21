import { ClassAttValue } from '../../lib/attrs/classAttValue.js';
import { parseAttr } from '../../lib/attrs/parseAttr.js';
import { CSSSelector, CSSSelectorSequence } from '../../lib/css.js';
import { CSSRuleConcrete } from '../../lib/style-css-tree.js';
import { createElement, createRoot } from '../../lib/xast.js';

describe('test parsing and stringifying of selectors', function () {
  /** @type {{
   * selectorInfo:import('../../lib/css.js').SimpleSelector[],
   * elData:{elName:string,atts:[string,string][]},
   * expected:boolean|null,
   * expectedComplex?:boolean
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
      selectorInfo: [{ type: 'ClassSelector', name: 'class1' }],
      elData: { elName: 'path', atts: [['class', 'class1 class2']] },
      expected: true,
    },
    {
      selectorInfo: [{ type: 'ClassSelector', name: 'class1' }],
      elData: { elName: 'path', atts: [['class', 'class2 class1']] },
      expected: true,
    },
    {
      selectorInfo: [{ type: 'ClassSelector', name: 'class1' }],
      elData: { elName: 'path', atts: [['class', 'cl']] },
      expected: false,
    },
    {
      selectorInfo: [
        { type: 'ClassSelector', name: 'class1' },
        { type: 'IdSelector', name: 'id1' },
      ],
      elData: { elName: 'path', atts: [['class', 'class1']] },
      expected: null,
      expectedComplex: false,
    },
    {
      selectorInfo: [
        { type: 'ClassSelector', name: 'class1' },
        { type: 'IdSelector', name: 'id1' },
      ],
      elData: {
        elName: 'path',
        atts: [
          ['class', 'class1'],
          ['id', 'id1'],
        ],
      },
      expected: null,
      expectedComplex: true,
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
    it(`test ${selector.getString()} - ${test.elData.atts}}`, function () {
      const rule = new CSSRuleConcrete(
        selector,
        [0, 0, 0],
        declarations,
        false,
      );
      const root = createRoot();
      /** @type {Object<string,import('../../lib/types.js').AttValue>} */
      const obj = {};
      test.elData.atts.forEach(
        (v) => (obj[v[0]] = parseAttr(test.elData.elName, v[0], v[1])),
      );
      const element = createElement(
        root,
        test.elData.elName,
        '',
        undefined,
        obj,
      );
      expect(rule._matches(element)).toBe(test.expected);
      if (test.expectedComplex !== undefined) {
        expect(rule.matches(element)).toBe(test.expectedComplex);
      }

      // If attribute is parseable, make sure the parsed version behaves the same.
      for (const attName of element.svgAtts.keys()) {
        if (attName === 'class') {
          ClassAttValue.getAttValue(element);
        }
      }
      expect(rule._matches(element)).toBe(test.expected);
      if (test.expectedComplex !== undefined) {
        expect(rule.matches(element)).toBe(test.expectedComplex);
      }
    });
  }
});
