import { parseFuncList } from '../../lib/svgo/tools.js';

const tests = [
  {
    in: 'func1()func2()',
    out: ['func1(', 'func2('],
  },
  {
    in: 'func1(a)func2( b  )',
    out: ['func1(a', 'func2( b  '],
  },
  {
    in: 'func1(a)  func2(b)',
    out: ['func1(a', 'func2(b'],
  },
  {
    in: 'func1(a) , func2(b)',
    out: ['func1(a', 'func2(b'],
  },
  {
    in: 'func1(a) ,, func2(b)',
    out: ['func1(a', ', func2(b'],
  },
];

for (const test of tests) {
  it(test.in, () => {
    const p = parseFuncList(test.in);
    expect(p).toEqual(test.out.concat(''));
  });
}
