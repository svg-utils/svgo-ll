import { parseStyleDeclarations } from '../../lib/css-tools.js';
import { createElement } from '../../lib/xast.js';
import { StyleToClassData } from '../../plugins/stylesToClasses.js';

describe('test savings calculation', () => {
  const testData = {
    props: 'fill:red',
    elements: [{ style: 'fill:red' }, { style: 'fill:red' }],
    className: 'a',
    expected: 2,
  };

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
});
