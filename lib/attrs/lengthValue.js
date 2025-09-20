import { AttValue } from './attValue.js';
import { ExactNum } from '../exactnum.js';
import { isDigit } from '../svgo/utils.js';

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
        return new UnitLengthValue(value, '');
      }
      let units = '';
      for (let index = value.length - 1; index >= 0; index--) {
        const char = value[index];
        if (isDigit(char) || char === '.') {
          const num = value.substring(0, index + 1);
          if (units === 'px') {
            return new UnitLengthValue(value.slice(0, value.length - 2), '');
          }
          return new UnitLengthValue(num, units);
        }
        units = char + units;
      }
    }
    return new LengthValue(value);
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
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
   * @returns {number|null}
   */
  getPixels() {
    throw new Error();
  }
}

class UnitLengthValue extends LengthValue {
  #value;
  #units;

  /**
   * @param {string|ExactNum} value
   * @param {string} units
   */
  constructor(value, units) {
    super(undefined);
    this.#value = typeof value === 'string' ? new ExactNum(value) : value;
    this.#units = units;
  }

  /**
   * @returns {number|null}
   */
  getPixels() {
    return this.#units === '' ? this.#value.getValue() : null;
  }

  /**
   * @param {number} numDigits
   * @returns {LengthValue}
   */
  round(numDigits) {
    return new UnitLengthValue(this.#value.round(numDigits), this.#units);
  }

  /**
   * @returns {string}
   */
  toString() {
    return this.#value.getMinifiedString() + this.#units;
  }
}
