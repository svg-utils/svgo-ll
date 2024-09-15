import { generateData } from './testutils.js';

test('script attributes', () => {
  const data = generateData('./test/lib/docdata/scripts.1.svg');
  expect(data.docData.hasScripts()).toBe(true);
});

test('script elements', () => {
  const data = generateData('./test/lib/docdata/scripts.2.svg');
  expect(data.docData.hasScripts()).toBe(true);
});
