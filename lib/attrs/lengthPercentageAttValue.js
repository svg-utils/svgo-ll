import { LengthPercentage } from '../types/lengthPercentage.js';
import { AttValue } from './attValue.js';

export class LengthPercentageAttValue extends AttValue {
  #value;

  /**
   * @param {string} value
   */
  constructor(value) {
    const keyword = LengthPercentageAttValue.getGlobalKeyword(value);
    super(keyword);
    this.#value = keyword ? undefined : LengthPercentage.parse(value);
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {LengthPercentageAttValue|undefined}
   */
  static getAttValue(element, attName) {
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new LengthPercentageAttValue(value),
    );
  }

  /**
   * @returns {number|null}
   */
  getPixels() {
    return this.#value ? this.#value.getPixels() : null;
  }

  toString() {
    return this.#value ? this.#value.toString() : super.toString();
  }
}
