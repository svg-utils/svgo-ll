import { LengthPercentage } from '../types/lengthPercentage.js';
import { AttValue } from './attValue.js';

export class LengthPercentageAttValue extends AttValue {
  #value;

  /**
   * @param {string|LengthPercentage} value
   * @param {boolean} [isImportant]
   */
  constructor(value, isImportant) {
    const keyword =
      typeof value === 'string'
        ? LengthPercentageAttValue.getGlobalKeyword(value)
        : undefined;
    super(keyword, isImportant);
    this.#value = keyword
      ? undefined
      : typeof value === 'string'
        ? LengthPercentage.parse(value)
        : value;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {LengthPercentageAttValue|undefined}
   * @deprecated
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

  /**
   * @param {number} numDigits
   */
  round(numDigits) {
    return new LengthPercentageAttValue(
      this.#value === undefined ? this : this.#value.round(numDigits),
    );
  }

  toString() {
    return this.#value ? this.#value.toString() : super.toString();
  }
}
