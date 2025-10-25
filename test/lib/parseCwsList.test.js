import { parseCwsList } from '../../lib/svgo/tools.js';

const tests = [
  { in: '1,2', out: ['1', '2'] },
  { in: '1 2', out: ['1', '2'] },
  { in: '1   2', out: ['1', '2'] },
  { in: '1 ,2', out: ['1', '2'] },
  { in: '1 ,   2', out: ['1', '2'] },
  { in: '1,   2', out: ['1', '2'] },
  { in: '  1,   2  ', out: ['1', '2'] },
];

for (const test of tests) {
  it(test.in, () => {
    expect(parseCwsList(test.in)).toEqual(test.out);
  });
}
