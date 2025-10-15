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
   * @returns {ColorAttValue}
   */
  getMinifiedValue() {
    return new ColorAttValue(this.#color.getMinifiedValue());
  }

  /**
   * @param {string|AttValue} value
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
