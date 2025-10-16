import { Color } from '../types/color.js';
import { AttValue } from './attValue.js';

export class ColorAttValue extends AttValue {
  #color;

  /**
   * @param {string|Color} value
   */
  constructor(value) {
    super();
    this.#color = typeof value === 'string' ? Color.parse(value) : value;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {ColorAttValue|undefined}
   */
  static getAttValue(element, attName) {
    /** @type {string|ColorAttValue|undefined} */
    let value = element.svgAtts.get(attName);
    if (typeof value === 'string') {
      value = new ColorAttValue(value);
      element.svgAtts.set(attName, value);
    }
    return value;
  }

  /**
   * @returns {ColorAttValue}
   */
  getMinifiedValue() {
    return new ColorAttValue(this.#color.getMinifiedValue());
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {ColorAttValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new ColorAttValue(value);
    }
    // @ts-ignore
    return value;
  }

  round() {
    return new ColorAttValue(this.#color.round());
  }

  toString() {
    return this.#color.toString();
  }
}
