import { FontSizeValue } from './attrs/fontSizeValue.js';
import { LengthOrPctValue } from './attrs/lengthOrPct.js';
import { LetterSpacingValue } from './attrs/letterSpacingValue.js';
import { OpacityValue } from './attrs/opacityValue.js';
import { StrokeDasharrayValue } from './attrs/strokeDashArrayValue.js';
import { WordSpacingValue } from './attrs/wordSpacingValue.js';

/**
 * @param {string} name
 * @param {string} value
 * @return {import('./types.js').SVGAttValue}
 */
export function parseProperty(name, value) {
  switch (name) {
    case 'stroke-dashoffset':
    case 'stroke-width':
      return LengthOrPctValue.getLengthOrPctObj(value);
    case 'fill-opacity':
    case 'opacity':
    case 'stop-opacity':
    case 'stroke-opacity':
      return OpacityValue.getObj(value);
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
