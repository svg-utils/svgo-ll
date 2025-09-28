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
}
