import { AttValue } from './attValue.js';
import { ExactNum } from '../exactnum.js';
import { isDigit } from '../svgo/utils.js';

export class LengthValue extends AttValue {
  /** @type {ExactNum} */
  #value;
  /** @type {string} */
  #units;

  /**
   * @param {string|ExactNum} value
   * @param {string} [units]
   */
  constructor(value, units) {
    super();
    const pv = parseValues(value, units);
    this.#value = pv.value;
    this.#units = pv.units;
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {LengthValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new LengthValue(value);
    }
    // @ts-ignore
    return value;
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
    return new LengthValue(this.#value.round(numDigits), this.#units);
  }

  /**
   * @returns {string}
   */
  toString() {
    return this.#value.getMinifiedString() + this.#units;
  }

  /**
   * @returns {string}
   */
  toStyleElementString() {
    return this.toString() + (this.#units === '' ? 'px' : '');
  }
}

/**
 * @param {string|ExactNum} value
 * @param {string} [units]
 * @returns {{value:ExactNum,units:string}}
 */
function parseValues(value, units) {
  if (typeof value === 'string') {
    // value should be string; parse it.
    value = value.trim();
    const lastChar = value[value.length - 1];
    if (isDigit(lastChar) || lastChar === '.') {
      return { value: new ExactNum(value), units: '' };
    }
    let units = '';
    for (let index = value.length - 1; index >= 0; index--) {
      const char = value[index];
      if (isDigit(char) || char === '.') {
        const num = value.substring(0, index + 1);
        if (units === 'px') {
          return {
            value: new ExactNum(value.slice(0, value.length - 2)),
            units: '',
          };
        }
        return { value: new ExactNum(num), units: units };
      }
      units = char + units;
    }
    throw new Error(value);
  }
  return { value: value, units: units ?? '' };
}
