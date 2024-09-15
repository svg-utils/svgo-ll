import { generateData } from './testutils.js';

test('hasClass 1', () => {
  const data = generateData('./test/lib/docdata/style.classes.1.svg');
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(styleData.hasClassReference('red')).toBe(true);
  expect(styleData.hasClassReference('green')).toBe(false);
});
