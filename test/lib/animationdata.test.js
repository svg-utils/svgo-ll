import { generateData } from './testutils.js';

test('has animations', () => {
  const data = generateData('./test/lib/docdata/animations.1.svg');
  expect(data.docData.hasAnimations()).toBe(true);
});

test('has no animations', () => {
  const data = generateData('./test/lib/docdata/animations.2.svg');
  expect(data.docData.hasAnimations()).toBe(false);
});
