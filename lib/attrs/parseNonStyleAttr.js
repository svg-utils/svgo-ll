import { AttValue } from './attValue.js';
import { ClassAttValue } from './classAttValue.js';
import { ClipPathAttValue } from './clipPathAttValue.js';
import { ColorAttValue } from './colorAttValue.js';
import { FilterAttValue } from './filterAttValue.js';
import { FontSizeAttValue } from './fontSizeAttValue.js';
import { HrefAttValue } from './hrefAttValue.js';
import { LengthPercentageAttValue } from './lengthPercentageAttValue.js';
import { LengthPercentageAutoAttValue } from './lengthPercentageAutoAttValue.js';
import { ListOfLengthPercentageAttValue } from './listOfLengthPercentageAttValue.js';
import { MarkerAttValue } from './markerAttValue.js';
import { MaskAttValue } from './maskAttValue.js';
import { OpacityAttValue } from './opacityAttValue.js';
import { PaintAttValue } from './paintAttValue.js';
import { PathAttValue } from './pathAttValue.js';
import { StdDeviationAttValue } from './stdDeviationAttValue.js';
import { StopOffsetAttValue } from './stopOffsetAttValue.js';
import { StrokeDasharrayAttValue } from './strokeDashArrayAttValue.js';
import { TextSpacingAttValue } from './textSpacingAttValue.js';
import { TransformAttValue } from './transformAttValue.js';
import { ViewBoxAttValue } from './viewBoxAttValue.js';

/**
 * @typedef {function(string,boolean?,string|undefined?):AttValue} ParseFunc
 */

/** @type {ParseFunc} */
const COLOR_PARSER = (value, isImportant) =>
  new ColorAttValue(value, !!isImportant);
/** @type {function(string,boolean?,string|undefined?):AttValue} */
const COORD_PARSER = (value, isImportant, elName) =>
  elName === 'text' || elName === 'tspan'
    ? new ListOfLengthPercentageAttValue(value, !!isImportant)
    : new LengthPercentageAttValue(value, !!isImportant);
/** @type {ParseFunc} */
const DIM_PARSER = (value, isImportant, elName) =>
  elName === 'rect'
    ? new LengthPercentageAutoAttValue(value, !!isImportant)
    : new LengthPercentageAttValue(value, !!isImportant);
/** @type {ParseFunc} */
const LENGTH_PCT_PARSER = (value, isImportant) =>
  new LengthPercentageAttValue(value, !!isImportant);
/** @type {ParseFunc} */
const LENGTH_PCT_AUTO_PARSER = (value, isImportant) =>
  new LengthPercentageAutoAttValue(value, !!isImportant);
/** @type {ParseFunc} */
const MARKER_PARSER = (value, isImportant) =>
  new MarkerAttValue(value, !!isImportant);
/** @type {function(string,boolean?,string|undefined?):AttValue} */
const OPACITY_PARSER = (value, isImportant) =>
  new OpacityAttValue(value, !!isImportant);
/** @type {function(string,boolean?,string|undefined?):AttValue} */
const PAINT_PARSER = (value, isImportant) =>
  new PaintAttValue(value, !!isImportant);
/** @type {ParseFunc} */
const TEXT_SPACING_PARSER = (value, isImportant) =>
  new TextSpacingAttValue(value, !!isImportant);
/** @type {function(string):AttValue} */
const TRANSFORM_PARSER = (value) => new TransformAttValue(value);

/** @type {Map<string,ParseFunc>} */
const parsers = new Map([
  ['class', (value) => new ClassAttValue(value)],
  [
    'clip-path',
    (value, isImportant) => new ClipPathAttValue(value, !!isImportant),
  ],
  ['color', COLOR_PARSER],
  ['cx', LENGTH_PCT_PARSER],
  ['cy', LENGTH_PCT_PARSER],
  ['d', (value) => new PathAttValue(value)],
  ['fill', PAINT_PARSER],
  ['fill-opacity', OPACITY_PARSER],
  ['filter', (value, isImportant) => new FilterAttValue(value, !!isImportant)],
  ['flood-color', COLOR_PARSER],
  [
    'font-size',
    (value, isImportant) => new FontSizeAttValue(value, !!isImportant),
  ],
  ['fr', LENGTH_PCT_PARSER],
  ['fx', LENGTH_PCT_PARSER],
  ['fy', LENGTH_PCT_PARSER],
  ['gradientTransform', TRANSFORM_PARSER],
  ['height', DIM_PARSER],
  ['href', (value) => new HrefAttValue(value)],
  ['letter-spacing', TEXT_SPACING_PARSER],
  ['lighting-color', COLOR_PARSER],
  ['marker-end', MARKER_PARSER],
  ['marker-mid', MARKER_PARSER],
  ['marker-start', MARKER_PARSER],
  ['mask', (value, isImportant) => new MaskAttValue(value, !!isImportant)],
  [
    'offset',
    (value, isImportant, elName) =>
      elName === 'stop' ? new StopOffsetAttValue(value) : new AttValue(value),
  ],
  ['opacity', OPACITY_PARSER],
  ['patternTransform', TRANSFORM_PARSER],
  ['r', LENGTH_PCT_PARSER],
  ['rx', LENGTH_PCT_AUTO_PARSER],
  ['ry', LENGTH_PCT_AUTO_PARSER],
  ['stdDeviation', (value) => new StdDeviationAttValue(value)],
  ['stop-color', COLOR_PARSER],
  ['stop-opacity', OPACITY_PARSER],
  ['stroke', PAINT_PARSER],
  [
    'stroke-dasharray',
    (value, isImportant) => new StrokeDasharrayAttValue(value, !!isImportant),
  ],
  ['stroke-dashoffset', LENGTH_PCT_PARSER],
  ['stroke-opacity', OPACITY_PARSER],
  ['stroke-width', LENGTH_PCT_PARSER],
  ['transform', TRANSFORM_PARSER],
  ['viewBox', (value) => new ViewBoxAttValue(value)],
  ['width', DIM_PARSER],
  ['word-spacing', TEXT_SPACING_PARSER],
  ['x', COORD_PARSER],
  ['x1', LENGTH_PCT_PARSER],
  ['x2', LENGTH_PCT_PARSER],
  ['y', COORD_PARSER],
  ['y1', LENGTH_PCT_PARSER],
  ['y2', LENGTH_PCT_PARSER],
]);

/**
 * @param {string} local
 * @param {string} value
 * @param {string} [elName]
 * @param {boolean} [isImportant=false]
 * @returns {AttValue}
 */
export function parseNonStyleAttr(local, value, elName, isImportant = false) {
  const parse = parsers.get(local);
  return parse
    ? parse(value, isImportant, elName)
    : new AttValue(value, isImportant);
}
