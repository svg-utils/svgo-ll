import { ClassAttValue } from './classAttValue.js';
import { ColorAttValue } from './colorAttValue.js';
import { FontSizeAttValue } from './fontSizeAttValue.js';
import { HrefAttValue } from './hrefAttValue.js';
import { LengthPercentageAttValue } from './lengthPercentageAttValue.js';
import { OpacityAttValue } from './opacityAttValue.js';
import { PaintAttValue } from './paintAttValue.js';
import { StrokeDasharrayAttValue } from './strokeDashArrayAttValue.js';
import { TextSpacingAttValue } from './textSpacingAttValue.js';

/** @type {function(string):import('../types.js').AttValue} */
const COLOR_PARSER = (value) => new ColorAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const LENGTH_PCT_PARSER = (value) => new LengthPercentageAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const OPACITY_PARSER = (value) => new OpacityAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const PAINT_PARSER = (value) => new PaintAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const TEXT_SPACING_PARSER = (value) => new TextSpacingAttValue(value);

/** @type {Map<string,function(string):import('../types.js').AttValue>} */
const parsers = new Map([
  ['class', (value) => new ClassAttValue(value)],
  ['color', COLOR_PARSER],
  ['fill', PAINT_PARSER],
  ['fill-opacity', OPACITY_PARSER],
  ['flood-color', COLOR_PARSER],
  ['font-size', (value) => new FontSizeAttValue(value)],
  ['href', (value) => new HrefAttValue(value)],
  ['letter-spacing', TEXT_SPACING_PARSER],
  ['lighting-color', COLOR_PARSER],
  ['opacity', OPACITY_PARSER],
  ['stop-color', COLOR_PARSER],
  ['stop-opacity', OPACITY_PARSER],
  ['stroke', PAINT_PARSER],
  ['stroke-dasharray', (value) => new StrokeDasharrayAttValue(value)],
  ['stroke-dashoffset', LENGTH_PCT_PARSER],
  ['stroke-opacity', OPACITY_PARSER],
  ['stroke-width', LENGTH_PCT_PARSER],
  ['word-spacing', TEXT_SPACING_PARSER],
]);

/**
 * @param {string} local
 * @param {string} value
 * @returns {import('../types.js').AttValue|string}
 */
export function parseAttr(local, value) {
  const parse = parsers.get(local);
  return parse ? parse(value) : value;
}
