import { generateId } from '../../lib/svgo/tools.js';

describe('test generateId() break points', () => {
  /** @type {{
   * input:number,
   * expected:string
   * }[]} */
  const testData = [
    { input: 0, expected: 'a' },
    { input: 51, expected: 'Z' },
    { input: 52, expected: 'a0' },
    { input: 53, expected: 'a1' },
    { input: 114, expected: 'b0' },
    { input: 3275, expected: 'ZZ' },
    { input: 3276, expected: 'a00' },
  ];

  for (let index = 0; index < testData.length; index++) {
    const test = testData[index];
    it(`test ${test.input}`, function () {
      expect(generateId(test.input)).toEqual(test.expected);
    });
  }
});

it('test generateId() for duplicates and leading digits', () => {
  const generatedIds = new Set();
  let index;
  for (index = 0; index < 200000; index++) {
    const id = generateId(index);
    if ('0123456789'.includes(id[0]) || generatedIds.has(id)) {
      break;
    }
    generatedIds.add(id);
  }

  expect(index).toBe(200000);
});
