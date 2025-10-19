import { ClassAttValue } from './classAttValue.js';
import { ClipPathAttValue } from './clipPathAttValue.js';
import { ColorAttValue } from './colorAttValue.js';
import { FilterAttValue } from './filterAttValue.js';
import { FontSizeAttValue } from './fontSizeAttValue.js';
import { HrefAttValue } from './hrefAttValue.js';
import { LengthPercentageAttValue } from './lengthPercentageAttValue.js';
import { MarkerAttValue } from './markerAttValue.js';
import { MaskAttValue } from './maskAttValue.js';
import { OpacityAttValue } from './opacityAttValue.js';
import { PaintAttValue } from './paintAttValue.js';
import { PathAttValue } from './pathAttValue.js';
import { StdDeviationAttValue } from './stdDeviationAttValue.js';
import { StrokeDasharrayAttValue } from './strokeDashArrayAttValue.js';
import { TextSpacingAttValue } from './textSpacingAttValue.js';
import { ViewBoxAttValue } from './viewBoxAttValue.js';

/** @type {function(string):import('../types.js').AttValue} */
const COLOR_PARSER = (value) => new ColorAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const LENGTH_PCT_PARSER = (value) => new LengthPercentageAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const MARKER_PARSER = (value) => new MarkerAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const OPACITY_PARSER = (value) => new OpacityAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const PAINT_PARSER = (value) => new PaintAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const TEXT_SPACING_PARSER = (value) => new TextSpacingAttValue(value);

/** @type {Map<string,function(string):import('../types.js').AttValue>} */
const parsers = new Map([
  ['class', (value) => new ClassAttValue(value)],
  ['clip-path', (value) => new ClipPathAttValue(value)],
  ['color', COLOR_PARSER],
  ['d', (value) => new PathAttValue(value)],
  ['fill', PAINT_PARSER],
  ['fill-opacity', OPACITY_PARSER],
  ['filter', (value) => new FilterAttValue(value)],
  ['flood-color', COLOR_PARSER],
  ['font-size', (value) => new FontSizeAttValue(value)],
  ['href', (value) => new HrefAttValue(value)],
  ['letter-spacing', TEXT_SPACING_PARSER],
  ['lighting-color', COLOR_PARSER],
  ['marker-end', MARKER_PARSER],
  ['marker-mid', MARKER_PARSER],
  ['marker-start', MARKER_PARSER],
  ['mask', (value) => new MaskAttValue(value)],
  ['opacity', OPACITY_PARSER],
  ['stdDeviation', (value) => new StdDeviationAttValue(value)],
  ['stop-color', COLOR_PARSER],
  ['stop-opacity', OPACITY_PARSER],
  ['stroke', PAINT_PARSER],
  ['stroke-dasharray', (value) => new StrokeDasharrayAttValue(value)],
  ['stroke-dashoffset', LENGTH_PCT_PARSER],
  ['stroke-opacity', OPACITY_PARSER],
  ['stroke-width', LENGTH_PCT_PARSER],
  ['viewBox', (value) => new ViewBoxAttValue(value)],
  ['word-spacing', TEXT_SPACING_PARSER],
]);

/**
 * @param {string} local
 * @param {string} value
 * @returns {import('../types.js').AttValue|string}
 */
export function parseNonStyleAttr(local, value) {
  const parse = parsers.get(local);
  return parse ? parse(value) : value;
}
