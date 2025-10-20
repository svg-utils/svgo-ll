import { parseNonStyleAttr } from './attrs/parseNonStyleAttr.js';
import { TransformAttValue } from './attrs/transformAttValue.js';
import { cssParseTransform } from './css/css-parse-transform.js';

/**
 * @param {string} name
 * @param {string} value
 * @return {import('./types.js').SVGAttValue}
 */
export function parseProperty(name, value) {
  switch (name) {
    case 'marker':
      return parseNonStyleAttr('marker-start', value);
    case 'transform':
      return new TransformAttValue(cssParseTransform(value));
  }
  return parseNonStyleAttr(name, value);
}
