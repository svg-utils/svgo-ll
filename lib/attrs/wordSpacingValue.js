import { AttValue } from './attValue.js';
import { LengthValue } from './lengthValue.js';

export class WordSpacingValue extends AttValue {
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
   * @returns {WordSpacingValue|undefined}
   */
  static getAttValue(element) {
    if (typeof element.attributes['word-spacing'] === 'string') {
      element.attributes['word-spacing'] = this.getObj(
        element.attributes['word-spacing'],
      );
    }
    // @ts-ignore
    return element.attributes['word-spacing'];
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {WordSpacingValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new WordSpacingValue(value);
    }
    // @ts-ignore
    return value;
  }

  /**
   * @param {number} numDigits
   * @returns {WordSpacingValue}
   */
  round(numDigits) {
    if (!this.#objValue) {
      return this;
    }
    return new WordSpacingValue(this.#objValue.round(numDigits));
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#objValue === undefined) {
      return '0';
    }
    return this.#objValue.toString();
  }
}
