import { parseAttr } from './attrs/parseAttr.js';
import { TransformAttValue } from './attrs/transformAttValue.js';
import { cssParseTransform } from './css-parse-decl.js';

/**
 * @param {string} name
 * @param {string} value
 * @return {import('./types.js').SVGAttValue}
 */
export function parseProperty(name, value) {
  switch (name) {
    case 'transform':
      if (typeof value === 'string') {
        const parsed = cssParseTransform(value);
        return parsed === null ? value : new TransformAttValue(parsed);
      }
      return value;
  }
  return parseAttr(name, value);
}
