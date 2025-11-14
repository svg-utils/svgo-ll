import { getBase64ImageDimensions } from '../../../lib/svgo/tools.js';

const tests = [
  {
    input:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcIAAAEsAQMAAABqmCH0AAAABlBMVEU6if////9iy28EAAAAc0lEQVR42u3YsQ2AMAwAQW/AyKzmkdjANKkQEmCkQHFfRro6tiNGa1VldCJJkiRJ8p1c6rokSZIkSXKqPHvdbv3yJEmSJEk+l2YTkiRJkvxauuSTJEmS5P9kNUuSJEmSJBtSkiTNzGxCkiRJkrZlSZJ0aAeMAAsUIb+gigAAAABJRU5ErkJggg==',
    expect: { width: 450, height: 300 },
  },
];

for (const test of tests) {
  it(`${test.input.substring(0, 40)}`, () => {
    const dimensions = getBase64ImageDimensions(test.input);
    if (dimensions === undefined) {
      throw new Error();
    }
    expect(dimensions.width).toBe(test.expect.width);
    expect(dimensions.height).toBe(test.expect.height);
  });
}
