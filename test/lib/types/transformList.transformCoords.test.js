import { TransformList } from '../../../lib/types/transformList.js';
import { ExactNum } from '../../../lib/utils/exactNum.js';

const tests = [
  { transform: 'translate(1 2)', in: { x: 3, y: 4 }, expect: { x: 4, y: 6 } },
  { transform: 'scale(2 3)', in: { x: 3, y: 4 }, expect: { x: 6, y: 12 } },
  { transform: 'rotate(1)', in: { x: 3, y: 4 }, expect: undefined },
];

for (const test of tests) {
  it(`${test.transform}`, () => {
    const tl = new TransformList(test.transform);
    const coords = tl.transformCoords({
      x: new ExactNum(test.in.x),
      y: new ExactNum(test.in.y),
    });
    if (coords === undefined) {
      expect(test.expect).toBeUndefined();
    } else {
      expect(coords.x.getValue()).toBe(test.expect?.x);
      expect(coords.y.getValue()).toBe(test.expect?.y);
    }
  });
}
