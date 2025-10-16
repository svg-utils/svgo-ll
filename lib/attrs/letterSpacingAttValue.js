import { isDigit } from '../svgo/utils.js';
import { Length } from '../types/lengthPercentage.js';
import { AttValue } from './attValue.js';

export class LetterSpacingAttValue extends AttValue {
  /** @type {Length|undefined} */
  #objValue;

  /**
   * @param {string|Length} value
   */
  constructor(value) {
    super();
    if (typeof value === 'string') {
      if (value !== 'normal') {
        this.#objValue = new Length(value);
      }
    } else {
      this.#objValue = value;
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {LetterSpacingAttValue|undefined}
   */
  static getAttValue(element) {
    return this.getAttValueGeneric(
      element,
      'letter-spacing',
      (value) => new LetterSpacingAttValue(value),
    );
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {LetterSpacingAttValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new LetterSpacingAttValue(value);
    }
    // @ts-ignore
    return value;
  }

  /**
   * @param {number} numDigits
   * @returns {LetterSpacingAttValue}
   */
  round(numDigits) {
    if (!this.#objValue) {
      return this;
    }
    return new LetterSpacingAttValue(this.#objValue.round(numDigits));
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
