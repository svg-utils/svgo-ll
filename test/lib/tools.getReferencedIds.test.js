import { getReferencedIds } from '../../lib/svgo/tools-svg.js';
import { createElement, createRoot } from '../../lib/xast.js';

/**
 * @typedef {{
 * elName:string,
 * atts:[string,string][],
 * expected:{id:string,attName:string}[]
 * }} TestInfo
 */

describe('getReferencedIds()', () => {
  /**
   * @type {TestInfo[]}
   */
  const testData = [
    {
      elName: 'path',
      atts: [],
      expected: [],
    },
    {
      elName: 'path',
      atts: [['href', '#a']],
      expected: [{ id: 'a', attName: 'href' }],
    },
    // url encoded
    {
      elName: 'path',
      atts: [['href', '#%61']],
      expected: [{ id: 'a', attName: 'href' }],
    },
    // non-ASCII
    {
      elName: 'path',
      atts: [['href', '#康']],
      expected: [{ id: '康', attName: 'href' }],
    },
    // non-ASCII encoded
    {
      elName: 'path',
      atts: [['href', '#%E5%BA%B7']],
      expected: [{ id: '康', attName: 'href' }],
    },
    // url() syntax doesn't work in href
    {
      elName: 'path',
      atts: [['href', 'url(#a)']],
      expected: [],
    },
    {
      elName: 'path',
      atts: [['href', '  #xY1-56']],
      expected: [{ id: 'xY1-56', attName: 'href' }],
    },
    {
      elName: 'path',
      atts: [['xlink:href', '  #xY1-56   ']],
      expected: [{ id: 'xY1-56', attName: 'xlink:href' }],
    },
    {
      elName: 'path',
      atts: [['fill', 'url(#ccc)']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    // url encoded
    {
      elName: 'path',
      atts: [['fill', 'url(#c%63c)']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    // space between url and "(" non allowed
    {
      elName: 'path',
      atts: [['fill', 'url (#ccc)']],
      expected: [],
    },
    // non-ASCII
    {
      elName: 'path',
      atts: [['fill', 'url(#康)']],
      expected: [{ id: '康', attName: 'fill' }],
    },
    {
      elName: 'path',
      atts: [['fill', '  url(#ccc)']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    {
      elName: 'path',
      atts: [['fill', '  url(  #ccc)']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    {
      elName: 'path',
      atts: [['fill', '  url(  #ccc   )']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    {
      elName: 'path',
      atts: [['fill', '  url(  #ccc   )  ']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    {
      elName: 'path',
      atts: [['fill', 'url("#ccc")']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    {
      elName: 'path',
      atts: [['fill', '  url("#ccc")']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    {
      elName: 'path',
      atts: [['fill', '  url(  "#ccc")']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    {
      elName: 'path',
      atts: [['fill', '  url(  "#ccc"   )']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    {
      elName: 'path',
      atts: [['fill', '  url(  "#ccc"   )  ']],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    // Mismatched quotes.
    {
      elName: 'path',
      atts: [['fill', 'url("#ccc\')']],
      expected: [],
    },
    // Single quotes.
    {
      elName: 'path',
      atts: [['fill', "url('#ccc')"]],
      expected: [{ id: 'ccc', attName: 'fill' }],
    },
    // Style attribute
    {
      elName: 'path',
      atts: [['style', 'fill:url(#ccc)']],
      expected: [{ id: 'ccc', attName: 'style' }],
    },
    // Multiple references.
    {
      elName: 'path',
      atts: [['style', 'fill:url(#ccc);stroke: url( #bbb)']],
      expected: [
        { id: 'ccc', attName: 'style' },
        { id: 'bbb', attName: 'style' },
      ],
    },
  ];

  for (let index = 0; index < testData.length; index++) {
    const test = testData[index];
    it(`test ${test.atts}`, function () {
      const root = createRoot();
      /** @type {Object<string,string>} */
      const atts = {};
      test.atts.forEach((a) => (atts[a[0]] = a[1]));
      const ids = getReferencedIds(createElement(root, test.elName, atts));
      expect(ids).toEqual(test.expected);
    });
  }
});
