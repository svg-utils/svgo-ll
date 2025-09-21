import { AttValueDeprecated } from './attValueDeprecated.js';
import { LengthOrPctValue } from './lengthOrPct.js';

export class FontSizeValue extends AttValueDeprecated {
  /** @type {import('../types.js').LengthValue|import('../types.js').PctValue|undefined} */
  #objValue;

  /**
   * @param {string|import('../types.js').LengthValue} value
   */
  constructor(value) {
    super(typeof value === 'string' ? value : undefined);
    if (typeof value === 'string') {
      const c = value[0];
      if ('.-+0123456789'.includes(c)) {
        this.#objValue = LengthOrPctValue.getLengthOrPctObj(value);
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
      return super.toString();
    }
    return this.#objValue.toString();
  }
}
