import { parseNonStyleAttr } from './parseNonStyleAttr.js';
import { StyleAttValue } from './styleAttValue.js';

/**
 * @param {string} elName
 * @param {string} local
 * @param {string} value
 * @returns {import('../types.js').AttValue|string}
 */
export function parseAttr(elName, local, value) {
  return local === 'style'
    ? new StyleAttValue(value)
    : parseNonStyleAttr(local, value, elName);
}
