import { ColorAttValue } from './colorAttValue.js';
import { OpacityAttValue } from './opacityAttValue.js';
import { PaintAttValue } from './paintAttValue.js';

/** @type {function(string):import('../types.js').AttValue} */
const COLOR_PARSER = (value) => new ColorAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const OPACITY_PARSER = (value) => new OpacityAttValue(value);
/** @type {function(string):import('../types.js').AttValue} */
const PAINT_PARSER = (value) => new PaintAttValue(value);

/** @type {Map<string,function(string):import('../types.js').AttValue>} */
const parsers = new Map([
  ['color', COLOR_PARSER],
  ['fill', PAINT_PARSER],
  ['fill-opacity', OPACITY_PARSER],
  ['flood-color', COLOR_PARSER],
  ['lighting-color', COLOR_PARSER],
  ['opacity', OPACITY_PARSER],
  ['stop-color', COLOR_PARSER],
  ['stop-opacity', OPACITY_PARSER],
  ['stroke', PAINT_PARSER],
  ['stroke-opacity', OPACITY_PARSER],
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
