import { TransformAttValue } from '../../../lib/attrs/transformAttValue.js';

const tests = [
  { in: 'noNE', out: 'none' },
  { in: ' iniTial ', out: 'initial' },
];

for (const test of tests) {
  it(test.in, () => {
    const att = new TransformAttValue(test.in);
    expect(att.toString()).toBe(test.out ?? test.in);
  });
}
