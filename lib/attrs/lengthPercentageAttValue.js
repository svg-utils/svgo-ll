import { LengthPercentage } from '../types/lengthPercentage.js';
import { AttValue } from './attValue.js';

export class LengthPercentageAttValue extends AttValue {
  #value;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.#value = LengthPercentage.parse(value);
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {LengthPercentageAttValue|undefined}
   */
  static getAttValue(element, attName) {
    /** @type {string|LengthPercentageAttValue|undefined} */
    let value = element.svgAtts.get(attName);
    if (typeof value === 'string') {
      value = new LengthPercentageAttValue(value);
      element.svgAtts.set(attName, value);
    }
    return value;
  }

  /**
   * @returns {number|null}
   */
  getPixels() {
    return this.#value.getPixels();
  }

  toString() {
    return this.#value.toString();
  }
}
