import { parseStyleDeclarations } from '../../lib/css-tools.js';
import { createElement, createRoot } from '../../lib/xast.js';
import { StyleToClassData } from '../../plugins/stylesToClasses.js';

describe('test savings calculation', () => {
  /**
   * @type {{props:string,elAtts:Object<string,string>[],className:string,expected:number}[]}
   */
  const testCases = [
    {
      props: 'fill:red',
      elAtts: [{ style: 'fill:red' }, { style: 'fill:red' }],
      className: 'a',
      expected: 2,
    },
    {
      props: 'fill:red',
      elAtts: [{ class: 'b', style: 'fill:red' }, { style: 'fill:red' }],
      className: 'a',
      expected: 10,
    },
    {
      props: 'fill:cornflowerblue',
      elAtts: [{ fill: 'cornflowerblue' }, { fill: 'cornflowerblue' }],
      className: 'a',
      expected: 1,
    },
    {
      props: 'font-size:14px',
      elAtts: [{ 'font-size': '14' }],
      className: 'a',
      expected: -13,
    },
  ];

  for (const testData of testCases) {
    it(`${testData.props}`, () => {
      const data = new StyleToClassData(
        parseStyleDeclarations(testData.props),
        testData.props,
      );
      const root = createRoot();
      for (const atts of testData.elAtts) {
        const e = createElement(root, 'elem', '', undefined, atts);
        data.addElement(e);
      }
      expect(data.calculateSavings(testData.className)).toBe(testData.expected);
    });
  }
});
