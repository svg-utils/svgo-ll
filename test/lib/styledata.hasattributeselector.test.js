import { generateData } from './testutils.js';

test('hasAttributeSelector', () => {
  const data = generateData('./test/lib/docdata/style.attselector.1.svg');
  const styles = data.docData.getStyles();
  expect(styles).toBeTruthy();
  if (!styles) {
    return;
  }
  expect(styles.hasAtRules()).toBe(false);
  expect(styles.hasAttributeSelector()).toBe(true);
  expect(styles.hasAttributeSelector('d')).toBe(true);
  expect(styles.hasAttributeSelector('x')).toBe(false);
});
test('hasAttributeSelector with media query', () => {
  const data = generateData('./test/lib/docdata/style.attselector.2.svg');
  const styles = data.docData.getStyles();
  expect(styles).toBeTruthy();
  if (!styles) {
    return;
  }
  expect(styles.hasAtRules()).toBe(true);
  expect(styles.hasAttributeSelector()).toBe(true);
  expect(styles.hasAttributeSelector('d')).toBe(true);
  expect(styles.hasAttributeSelector('x')).toBe(false);
});
