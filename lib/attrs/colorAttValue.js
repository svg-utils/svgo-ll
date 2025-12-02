import { Color } from '../types/color.js';
import { AttValue } from './attValue.js';

export class ColorAttValue extends AttValue {
  #color;

  /**
   * @param {string|Color} value
   * @param {boolean} [isImportant]
   */
  constructor(value, isImportant) {
    super(undefined, isImportant);
    this.#color = typeof value === 'string' ? Color.parse(value) : value;
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
