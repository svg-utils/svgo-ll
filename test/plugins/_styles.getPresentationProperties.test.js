import { StyleAttValue } from '../../lib/attrs/styleAttValue.js';
import { createElement, createRoot } from '../../lib/xast.js';
import { getPresentationProperties } from '../../plugins/_styles.js';

/** @type {{attributes:Object<string,import('../../lib/types.js').SVGAttValue>,expected:string}[]} */
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
      const element = createElement(root, 'g', testCase.attributes);
      const props = getPresentationProperties(element);
      const attValue = new StyleAttValue(props);
      expect(attValue.toString()).toBe(testCase.expected);
    });
  }
});
