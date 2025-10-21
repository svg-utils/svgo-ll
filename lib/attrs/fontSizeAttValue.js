import { isDigit } from '../svgo/utils.js';
import { LengthPercentage } from '../types/lengthPercentage.js';
import { AttValue } from './attValue.js';

export class FontSizeAttValue extends AttValue {
  /** @type {LengthPercentage|undefined} */
  #objValue;
  #strValue;

  /**
   * @param {string|LengthPercentage} value
   */
  constructor(value) {
    super();
    if (typeof value === 'string') {
      const c = value[0];
      if ('.-+0123456789'.includes(c)) {
        this.#objValue = LengthPercentage.parse(value);
      } else {
        this.#strValue = value;
      }
    } else {
      this.#objValue = value;
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {FontSizeAttValue|undefined}
   */
  static getAttValue(element) {
    return this.getAttValueGeneric(
      element,
      'font-size',
      (value) => new FontSizeAttValue(value),
    );
  }

  /**
   * @param {number} numDigits
   * @returns {FontSizeAttValue}
   */
  round(numDigits) {
    if (!this.#objValue) {
      return this;
    }
    return new FontSizeAttValue(this.#objValue.round(numDigits));
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#objValue === undefined) {
      // @ts-ignore
      return this.#strValue;
    }
    return this.#objValue.toString();
  }

  /**
   * @returns {string}
   */
  toStyleElementString() {
    const s = this.toString();
    // Add px to numbers if no units specified.
    return isDigit(s[s.length - 1]) ? s + 'px' : s;
  }
}
