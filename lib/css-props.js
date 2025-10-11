import { FontSizeValue } from './attrs/fontSizeValue.js';
import { LengthOrPctValue } from './attrs/lengthOrPct.js';
import { LetterSpacingValue } from './attrs/letterSpacingValue.js';
import { OpacityValue } from './attrs/opacityValue.js';
import { PaintAttValue } from './attrs/paintAttValue.js';
import { StrokeDasharrayValue } from './attrs/strokeDashArrayValue.js';
import { TransformValue } from './attrs/transformValue.js';
import { WordSpacingValue } from './attrs/wordSpacingValue.js';
import { cssParseTransform } from './css-parse-decl.js';

/**
 * @param {string} name
 * @param {string} value
 * @return {import('./types.js').SVGAttValue}
 */
export function parseProperty(name, value) {
  switch (name) {
    case 'fill':
    case 'stroke':
      return PaintAttValue.getObj(value);
    case 'stroke-dashoffset':
    case 'stroke-width':
      return LengthOrPctValue.getObj(value);
    case 'fill-opacity':
    case 'opacity':
    case 'stop-opacity':
    case 'stroke-opacity':
      return OpacityValue.getObj(value);
    case 'transform':
      if (typeof value === 'string') {
        const parsed = cssParseTransform(value);
        return parsed === null ? value : new TransformValue(parsed);
      }
      return value;
    case 'font-size':
      return FontSizeValue.getObj(value);
    case 'stroke-dasharray':
      return StrokeDasharrayValue.getObj(value);
    case 'letter-spacing':
      return LetterSpacingValue.getObj(value);
    case 'word-spacing':
      return WordSpacingValue.getObj(value);
  }
  return value;
}
