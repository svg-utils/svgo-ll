import { AttValue } from './attValue.js';
import { LengthOrPctValue } from './lengthOrPct.js';

/**
 * @typedef {import('../types.js').CSSGlobalKeyword|(import('../types.js').LengthValue|import('../types.js').PctValue)[]} ListOfLengthOrPct
 */

export class ListOfLengthOrPctValue extends AttValue {
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
          .map((item) => LengthOrPctValue.getObj(item));
      }
    } else {
      this.#value = value;
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {ListOfLengthOrPctValue|undefined}
   */
  static getAttValue(element, attName) {
    if (typeof element.attributes[attName] === 'string') {
      element.attributes[attName] = this.getObj(element.attributes[attName]);
    }
    // @ts-ignore
    return element.attributes[attName];
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {ListOfLengthOrPctValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new ListOfLengthOrPctValue(value);
    }
    // @ts-ignore
    return value;
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
