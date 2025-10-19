import { parseNonStyleAttr } from './parseNonStyleAttr.js';
import { StyleAttValue } from './styleAttValue.js';

/**
 * @param {string} local
 * @param {string} value
 * @returns {import('../types.js').AttValue|string}
 */
export function parseAttr(local, value) {
  return local === 'style'
    ? new StyleAttValue(value)
    : parseNonStyleAttr(local, value);
}
