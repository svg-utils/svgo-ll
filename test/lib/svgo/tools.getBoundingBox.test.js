import { getBoundingBox } from '../../../lib/svgo/tools.js';
import { createTestElement } from '../../utils.js';

const tests = [
  {
    in: {
      name: 'rect',
      atts: { width: '55', height: '80.038612', x: '45', y: '30' },
    },
    expect: { x1: 45, y1: 30, x2: 100, y2: 110.038612 },
  },
];

for (const test of tests) {
  it(`${test.in.name} ${JSON.stringify(test.in.atts)}`, () => {
    const element = createTestElement(test.in.name, test.in.atts);
    const bb = getBoundingBox(element);
    ['x1', 'y1', 'x2', 'y2'].forEach((name) =>
      // @ts-ignore
      expect(bb[name].getValue()).toBe(test.expect[name]),
    );
  });
}
