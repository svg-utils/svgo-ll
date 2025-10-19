import { PaintAttValue } from './paintAttValue.js';

/** @type {function(string):import('../types.js').AttValue} */
const PAINT_PARSER = (value) => new PaintAttValue(value);

/** @type {Map<string,function(string):import('../types.js').AttValue>} */
const parsers = new Map([
  ['fill', PAINT_PARSER],
  ['stroke', PAINT_PARSER],
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
