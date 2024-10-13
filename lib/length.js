import { AttValue } from './attvalue.js';
import { isDigit, minifyNumber, toFixed } from './svgo/tools.js';

export class LengthValue extends AttValue {
  /**
   * @param {string|undefined} strVal
   */
  constructor(strVal) {
    super(strVal);
  }

  /**
   * @param {string} value
   * @returns {LengthValue}
   */
  static #createLengthObj(value) {
    value = value.trim();
    if (value.length > 0) {
      const lastChar = value[value.length - 1];
      if (isDigit(lastChar) || lastChar === '.') {
        return new PixelLengthValue(value, undefined);
      }
    }
    return new LengthValue(value);
  }

  /**
   * @param {string|AttValue} value
   * @returns {LengthValue}
   */
  static getLengthObj(value) {
    if (typeof value === 'string') {
      return this.#createLengthObj(value);
    }
    if (value instanceof LengthValue) {
      return value;
    }
    throw value;
  }

  /**
   * @param {number} digits
   * @returns {LengthValue}
   */
  // eslint-disable-next-line no-unused-vars
  round(digits) {
    return this;
  }
}

class PixelLengthValue extends LengthValue {
  #pixels;

  /**
   * @param {string|undefined} value
   * @param {number|undefined} pixels
   */
  constructor(value, pixels) {
    super(value);
    this.#pixels = pixels;
  }

  generateString() {
    if (this.#pixels === undefined) {
      throw new Error();
    }
    return minifyNumber(this.#pixels);
  }

  getPixels() {
    if (this.#pixels === undefined) {
      this.#pixels = parseFloat(super.toString());
    }
    return this.#pixels;
  }

  /**
   * @param {number} digits
   * @returns {LengthValue}
   */
  round(digits) {
    return new PixelLengthValue(undefined, toFixed(this.getPixels(), digits));
  }
}
