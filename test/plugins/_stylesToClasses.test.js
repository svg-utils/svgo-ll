import { parseStyleDeclarations } from '../../lib/css-tools.js';
import { createElement } from '../../lib/xast.js';
import { StyleToClassData } from '../../plugins/stylesToClasses.js';

describe('test savings calculation', () => {
  /**
   * @type {{props:string,elements:Object<string,string>[],className:string,expected:number}[]}
   */
  const testCases = [
    {
      props: 'fill:red',
      elements: [{ style: 'fill:red' }, { style: 'fill:red' }],
      className: 'a',
      expected: 2,
    },
    {
      props: 'fill:red',
      elements: [{ class: 'b', style: 'fill:red' }, { style: 'fill:red' }],
      className: 'a',
      expected: 10,
    },
    {
      props: 'fill:cornflowerblue',
      elements: [{ fill: 'cornflowerblue' }, { fill: 'cornflowerblue' }],
      className: 'a',
      expected: 1,
    },
    {
      props: 'font-size:14px',
      elements: [{ 'font-size': '14' }],
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
      /** @type {import('../lib/xast.test.js').XastRoot} */
      const root = { type: 'root', children: [] };
      for (const element of testData.elements) {
        const e = createElement(root, 'elem', element);
        data.addElement(e);
      }
      expect(data.calculateSavings(testData.className)).toBe(testData.expected);
    });
  }
});
