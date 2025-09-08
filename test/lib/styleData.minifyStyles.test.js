import { generateData } from './testutils.js';

test('remove all', () => {
  const data = generateData('style.minifyStyles.1.svg');
  const styleData = data.docData.getStyles();
  if (!styleData) {
    throw new Error();
  }
  expect(styleData.hasStyles()).toBe(true);
  styleData.minifyStyles({ classes: [], ids: [], tags: [] });
  expect(styleData.hasStyles()).toBe(false);
});
