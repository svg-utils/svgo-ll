import { generateData } from './testutils.js';

/**
 * @param {Set<import('../../lib/docdata.js').CSSFeatures>} s
 * @param {import('../../lib/docdata.js').CSSFeatures[]} a
 */
function setsAreIdentical(s, a) {
  if (s.size !== a.length) {
    return false;
  }
  return a.every((str) => s.has(str));
}

/**
 * @param {string} fileSuffix
 * @param {import('../../lib/docdata.js').CSSFeatures[]} expected
 */
function checkFile(fileSuffix, expected) {
  const data = generateData(
    `./test/lib/docdata/style.getfeatures.${fileSuffix}.svg`,
  );
  const styles = data.docData.getStyles();
  expect(styles).toBeTruthy();
  if (!styles) {
    return;
  }
  const features = styles.getFeatures();
  return setsAreIdentical(features, expected);
}

test('getFeatures', () => {
  expect(checkFile('1', ['simple-selectors'])).toBe(true);
  expect(checkFile('2', ['atrules', 'combinators', 'simple-selectors'])).toBe(
    true,
  );

  expect(
    checkFile('3', ['atrules', 'combinators', 'pseudos', 'simple-selectors']),
  ).toBe(true);
  expect(
    checkFile('4', ['atrules', 'combinators', 'pseudos', 'simple-selectors']),
  ).toBe(true);
  // No style elements.
  expect(checkFile('5', [])).toBe(true);
  // Empty style element.
  expect(checkFile('6', [])).toBe(true);
  // Same as test 4, but with media query in style element.
  expect(
    checkFile('7', ['atrules', 'combinators', 'pseudos', 'simple-selectors']),
  ).toBe(true);
  // Same as test 1, but with type="text/css".
  expect(checkFile('8', ['simple-selectors'])).toBe(true);
  // If media=" all ", should not count as a media query.
  expect(checkFile('9', ['simple-selectors'])).toBe(true);
  // If media=" ", should not count as a media query.
  expect(checkFile('10', ['simple-selectors'])).toBe(true);
  // If @media all{}, should not count as a media query.
  expect(checkFile('11', ['simple-selectors'])).toBe(true);
  // If @media {}, should not count as a media query.
  expect(checkFile('12', ['simple-selectors'])).toBe(true);

  // Same as test 1, but with id="whatever" in <style> element
  expect(checkFile('13', ['simple-selectors'])).toBe(true);
});
