/**
 * @param {string} c
 * @returns {boolean}
 */
export function isDigit(c) {
  const codePoint = c.codePointAt(0);
  if (codePoint === undefined) {
    return false;
  }
  return 48 <= codePoint && codePoint <= 57;
}
