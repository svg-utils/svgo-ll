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
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new ColorAttValue(value),
    );
  }

  /**
   * @returns {ColorAttValue}
   */
  getMinifiedValue() {
    return new ColorAttValue(this.#color.getMinifiedValue());
  }

  round() {
    return new ColorAttValue(this.#color.round());
  }

  toString() {
    return this.#color.toString();
  }
}
