import { ColorAttValue } from './attrs/colorAttValue.js';
import { FontSizeAttValue } from './attrs/fontSizeAttValue.js';
import { LengthPercentageAttValue } from './attrs/lengthPercentageAttValue.js';
import { OpacityAttValue } from './attrs/opacityAttValue.js';
import { PaintAttValue } from './attrs/paintAttValue.js';
import { StrokeDasharrayAttValue } from './attrs/strokeDashArrayAttValue.js';
import { TextSpacingAttValue } from './attrs/textSpacingAttValue.js';
import { TransformAttValue } from './attrs/transformAttValue.js';
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
    case 'color':
    case 'flood-color':
    case 'lighting-color':
    case 'stop-color':
      return ColorAttValue.getObj(value);
    case 'stroke-dashoffset':
    case 'stroke-width':
      return new LengthPercentageAttValue(value);
    case 'fill-opacity':
    case 'opacity':
    case 'stop-opacity':
    case 'stroke-opacity':
      return new OpacityAttValue(value);
    case 'transform':
      if (typeof value === 'string') {
        const parsed = cssParseTransform(value);
        return parsed === null ? value : new TransformAttValue(parsed);
      }
      return value;
    case 'font-size':
      return new FontSizeAttValue(value);
    case 'stroke-dasharray':
      return new StrokeDasharrayAttValue(value);
    case 'letter-spacing':
    case 'word-spacing':
      return new TextSpacingAttValue(value);
  }
  return value;
}
