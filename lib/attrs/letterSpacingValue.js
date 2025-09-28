import { isDigit } from '../svgo/utils.js';
import { AttValue } from './attValue.js';
import { LengthValue } from './lengthValue.js';

export class LetterSpacingValue extends AttValue {
  /** @type {import('../types.js').LengthValue|undefined} */
  #objValue;

  /**
   * @param {string|import('../types.js').LengthValue} value
   */
  constructor(value) {
    super();
    if (typeof value === 'string') {
      if (value !== 'normal') {
        this.#objValue = LengthValue.getObj(value);
      }
    } else {
      this.#objValue = value;
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {LetterSpacingValue|undefined}
   */
  static getAttValue(element) {
    if (typeof element.attributes['letter-spacing'] === 'string') {
      element.attributes['letter-spacing'] = this.getObj(
        element.attributes['letter-spacing'],
      );
    }
    // @ts-ignore
    return element.attributes['letter-spacing'];
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {LetterSpacingValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new LetterSpacingValue(value);
    }
    // @ts-ignore
    return value;
  }

  /**
   * @param {number} numDigits
   * @returns {LetterSpacingValue}
   */
  round(numDigits) {
    if (!this.#objValue) {
      return this;
    }
    return new LetterSpacingValue(this.#objValue.round(numDigits));
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#objValue === undefined) {
      return 'normal';
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
