import { AttValue } from './attValue.js';
import { LengthOrPctValue } from './lengthOrPct.js';

export class FontSizeValue extends AttValue {
  /** @type {import('../types.js').LengthValue|import('../types.js').PctValue|undefined} */
  #objValue;
  #strValue;

  /**
   * @param {string|import('../types.js').LengthValue} value
   */
  constructor(value) {
    super();
    if (typeof value === 'string') {
      const c = value[0];
      if ('.-+0123456789'.includes(c)) {
        this.#objValue = LengthOrPctValue.getLengthOrPctObj(value);
      } else {
        this.#strValue = value;
      }
    } else {
      this.#objValue = value;
    }
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {FontSizeValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new FontSizeValue(value);
    }
    // @ts-ignore
    return value;
  }

  /**
   * @param {number} numDigits
   * @returns {FontSizeValue}
   */
  round(numDigits) {
    if (!this.#objValue) {
      return this;
    }
    return new FontSizeValue(this.#objValue.round(numDigits));
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
    if (this.#objValue === undefined) {
      // @ts-ignore
      return this.#strValue;
    }
    return this.#objValue.toStyleElementString();
  }
}
