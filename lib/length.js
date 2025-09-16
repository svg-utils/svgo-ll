import { AttValue } from './attvalue.js';
import { ExactNum } from './exactnum.js';
import { minifyNumber, toFixed } from './svgo/tools.js';
import { isDigit } from './svgo/utils.js';

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
      let units = '';
      for (let index = value.length - 1; index >= 0; index--) {
        const char = value[index];
        if (isDigit(char) || char === '.') {
          const num = value.substring(0, index + 1);
          if (units === 'px') {
            return new PixelLengthValue(
              value.slice(0, value.length - 2),
              undefined,
            );
          }
          return new UnitLengthValue(num, units);
        }
        units = char + units;
      }
    }
    return new LengthValue(value);
  }

  /**
   * @param {import('./types.js').SVGAttValue} value
   * @returns {LengthValue}
   */
  static getLengthObj(value) {
    if (typeof value === 'string') {
      return this.#createLengthObj(value);
    }
    if (value instanceof LengthValue) {
      return value;
    }
    throw new Error(String(value));
  }

  /**
   * @returns {LengthValue}
   */
  getMinifiedValue() {
    return this;
  }

  /**
   * @returns {number|null}
   */
  getPixels() {
    return null;
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

  /**
   * @returns {LengthValue}
   */
  getMinifiedValue() {
    const pixels = this.getPixels();
    if (pixels === null) {
      throw new Error();
    }
    return new PixelLengthValue(minifyNumber(pixels), this.#pixels);
  }

  /**
   * @returns {number|null}
   */
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
    const pixels = this.getPixels();
    if (pixels === null) {
      return this;
    }
    return new PixelLengthValue(undefined, toFixed(pixels, digits));
  }

  /**
   * @returns {string}
   */
  toString() {
    const str = super.toString();
    return str.endsWith('px') ? str.slice(0, str.length - 2) : str;
  }
}

class UnitLengthValue extends LengthValue {
  #value;
  #units;

  /**
   * @param {string} value
   * @param {string} units
   */
  constructor(value, units) {
    super(value + units);
    this.#value = new ExactNum(value);
    this.#units = units;
  }

  /**
   * @returns {LengthValue}
   */
  getMinifiedValue() {
    return new UnitLengthValue(this.#value.getMinifiedString(), this.#units);
  }
}
