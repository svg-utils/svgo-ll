import { LengthPercentage } from '../types/lengthPercentage.js';
import { AttValue } from './attValue.js';

/**
 * @typedef {import('../types.js').CSSGlobalKeyword|LengthPercentage[]} ListOfLengthOrPct
 */

export class ListOfLengthPercentageAttValue extends AttValue {
  /** @type {ListOfLengthOrPct} */
  #value;
  /** @type {string|undefined} */
  #strValue;

  /**
   * @param {ListOfLengthOrPct|string} value
   */
  constructor(value) {
    super();
    if (typeof value === 'string') {
      value = value.trim();
      const global = AttValue.getGlobalKeyword(value);
      if (global !== undefined) {
        this.#value = global;
      } else {
        this.#value = value
          .replaceAll(',', ' ')
          .split(/\s+/)
          .map((item) => LengthPercentage.parse(item));
      }
    } else {
      this.#value = value;
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {ListOfLengthPercentageAttValue|undefined}
   */
  static getAttValue(element, attName) {
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new ListOfLengthPercentageAttValue(value),
    );
  }

  toString() {
    if (this.#strValue === undefined) {
      if (typeof this.#value === 'string') {
        this.#strValue = this.#value;
      } else {
        this.#strValue =
          this.#value.length === 0
            ? 'none'
            : this.#value.map((item) => item.toString()).join(',');
      }
    }
    return this.#strValue;
  }
}
