import { ExactNum } from '../exactnum.js';
import { isDigit } from '../svgo/utils.js';
import { DataType } from './dataType.js';

export class LengthPercentage extends DataType {
  /**
   * @returns {number|null}
   */
  getPixels() {
    return null;
  }

  /**
   * @param {string} value
   * @returns
   */
  static parse(value) {
    value = value.trim();
    if (value.endsWith('%')) {
      return new Percentage(new ExactNum(value.substring(0, value.length - 1)));
    }
    return new Length(value);
  }

  /**
   * @param {number} _numDigits
   * @returns {LengthPercentage}
   * @virtual
   */
  round(_numDigits) {
    throw new Error();
  }
}

export class Length extends LengthPercentage {
  /** @type {ExactNum} */
  #value;
  /** @type {string} */
  #units;
  /** @type {string|undefined} */
  #strValue;

  /**
   * @param {string|ExactNum} value
   * @param {string} [units]
   */
  constructor(value, units) {
    super();
    const pv = parseLength(value, units);
    this.#value = pv.value;
    this.#units = pv.units;
  }

  /**
   * @returns {number|null}
   */
  getPixels() {
    return this.#units === '' ? this.#value.getValue() : null;
  }

  /**
   * @param {number} numDigits
   * @returns {Length}
   */
  round(numDigits) {
    return new Length(this.#value.round(numDigits), this.#units);
  }

  toString() {
    if (this.#strValue === undefined) {
      this.#strValue = this.#value.getMinifiedString() + this.#units;
    }
    return this.#strValue;
  }
}

/**
 * @param {string|ExactNum} value
 * @param {string} [units]
 * @returns {{value:ExactNum,units:string}}
 */
function parseLength(value, units) {
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

export class Percentage extends LengthPercentage {
  #value;
  /** @type {string|undefined} */
  #strValue;

  /**
   * @param {ExactNum} value
   */
  constructor(value) {
    super();
    this.#value = value;
  }

  /**
   * @param {number} numDigits
   * @returns {Percentage}
   */
  round(numDigits) {
    return new Percentage(
      new ExactNum((this.#value.getValue() / 100).toFixed(numDigits)),
    );
  }

  toString() {
    if (this.#strValue === undefined) {
      this.#strValue = `${this.#value.getMinifiedString()}%`;
    }
    return this.#strValue;
  }
}
