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
    expect(parseCsw(test.in)).toEqual(test.out);
  });
}

/**
 * @param {string} list
 * @returns {string[]}
 */
function parseCsw(list) {
  return list.trim().split(/(?:\s*,\s*|\s+)/);
}
