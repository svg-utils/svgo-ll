import { parseNonStyleAttr } from './attrs/parseNonStyleAttr.js';
import { TransformAttValue } from './attrs/transformAttValue.js';
import { cssParseTransform } from './css/css-parse-transform.js';

/**
 * @param {string} name
 * @param {string} value
 * @param {boolean} isImportant
 * @return {import('./types.js').AttValue}
 */
export function parseProperty(name, value, isImportant) {
  switch (name) {
    case 'marker':
      return parseNonStyleAttr('marker-start', value, undefined, isImportant);
    case 'transform':
      return new TransformAttValue(cssParseTransform(value), isImportant);
  }
  return parseNonStyleAttr(name, value, undefined, isImportant);
}
