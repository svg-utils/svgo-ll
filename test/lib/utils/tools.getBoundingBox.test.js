import { getBoundingBox } from '../../../lib/utils/tools-shapes.js';
import { createTestElement } from '../../utils.js';

/** @type {{in:{name:string,atts:Object<string,string>},expect:{x1:number,x2:number,y1:number,y2:number}}[]} */
const tests = [
  {
    in: {
      name: 'rect',
      atts: { width: '55', height: '80.038612', x: '45', y: '30' },
    },
    expect: { x1: 45, y1: 30, x2: 100, y2: 110.038612 },
  },
  {
    in: {
      name: 'path',
      atts: { d: 'm10 20h30v40' },
    },
    expect: { x1: 10, y1: 20, x2: 40, y2: 60 },
  },
  {
    in: {
      name: 'path',
      atts: { d: 'M10 20H30V40' },
    },
    expect: { x1: 10, y1: 20, x2: 30, y2: 40 },
  },
  {
    in: {
      name: 'path',
      atts: { d: 'm10 20l5 6' },
    },
    expect: { x1: 10, y1: 20, x2: 15, y2: 26 },
  },
  {
    in: {
      name: 'path',
      atts: { d: 'm10 20L5 6' },
    },
    expect: { x1: 5, y1: 6, x2: 10, y2: 20 },
  },
];

/** @type {('x1'|'y1'|'x2'|'y2')[]} */
const coordNames = ['x1', 'y1', 'x2', 'y2'];
for (const test of tests) {
  it(`${test.in.name} ${JSON.stringify(test.in.atts)}`, () => {
    const element = createTestElement(test.in.name, test.in.atts);
    const bb = getBoundingBox(element);
    if (bb === undefined) {
      expect(test.expect).toBeUndefined();
    } else {
      coordNames.forEach((name) =>
        expect(bb[name].getValue()).toBe(test.expect[name]),
      );
    }
  });
}
