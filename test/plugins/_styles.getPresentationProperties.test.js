import { SvgAttMap } from '../../lib/ast/svgAttMap.js';
import { parseAttr } from '../../lib/attrs/parseAttr.js';
import { StyleAttValue } from '../../lib/attrs/styleAttValue.js';
import { createElement, createRoot } from '../../lib/xast.js';
import { getPresentationProperties } from '../../plugins/_styles.js';

/** @type {{attributes:Object<string,string>,expected:string}[]} */
const testCases = [
  {
    attributes: { 'marker-mid': 'url(#a)' },
    expected: 'marker-mid:url(#a)',
  },
  {
    attributes: {
      'marker-start': 'url(#a)',
      'marker-mid': 'url(#a)',
      'marker-end': 'url(#a)',
    },
    expected: 'marker:url(#a)',
  },
  {
    attributes: {
      'marker-start': 'url(#a)',
      'marker-mid': 'url(#a)',
      'marker-end': 'url(#b)',
    },
    expected: 'marker-start:url(#a);marker-mid:url(#a);marker-end:url(#b)',
  },
  {
    attributes: { style: 'marker:url(#a)' },
    expected: 'marker:url(#a)',
  },
];

describe('test getPresentationProperties() parsing and stringification', () => {
  for (const testCase of testCases) {
    it(`${JSON.stringify(testCase.attributes)}`, () => {
      const root = createRoot();
      /** @type {Object<string,import('../../lib/types.js').AttValue>} */
      const atts = {};
      for (const [k, v] of Object.entries(testCase.attributes)) {
        atts[k] = parseAttr('g', k, v);
      }
      const element = createElement(root, 'g', '', undefined, atts);
      const props = getPresentationProperties(element);
      const attValue = new StyleAttValue(new SvgAttMap(props.entries()));
      expect(attValue.toString()).toBe(testCase.expected);
    });
  }
});
