import { AttValue } from './attvalue.js';
import { ExactNum } from './exactnum.js';
import { isNumber, toFixed } from './svgo/tools.js';

export class StopOffsetValue extends AttValue {
  /**
   * @param {string|undefined} strVal
   */
  constructor(strVal) {
    super(strVal);
  }

  /**
   * @param {string} value
   * @returns {StopOffsetValue}
   */
  static #createStopOffsetObj(value) {
    value = value.trim();
    if (value.endsWith('%')) {
      const pct = value.substring(0, value.length - 1);
      if (isNumber(pct)) {
        return new PctStopOffsetValue(new ExactNum(pct));
      }
    } else {
      if (isNumber(value)) {
        return new NumericStopOffsetValue(new ExactNum(value));
      }
    }
    return new StopOffsetValue(value);
  }

  /**
   * @param {string|AttValue} value
   * @returns {StopOffsetValue}
   */
  static getStopOffsetObj(value) {
    if (typeof value === 'string') {
      return this.#createStopOffsetObj(value);
    }
    if (value instanceof StopOffsetValue) {
      return value;
    }
    throw value;
  }

  /**
   * @returns {StopOffsetValue}
   */
  getMinifiedValue() {
    return this;
  }

  /**
   * @param {number} digits
   * @returns {StopOffsetValue}
   */
  // eslint-disable-next-line no-unused-vars
  round(digits) {
    return this;
  }
}

class NumericStopOffsetValue extends StopOffsetValue {
  #n;

  /**
   * @param {ExactNum} n
   */
  constructor(n) {
    super(undefined);
    this.#n = n;
  }

  generateString() {
    return this.#n.getMinifiedString();
  }

  getMinifiedValue() {
    const value = this.#n.getValue();
    // Use % if it can be represented as a single digit.
    if (value >= 0.01 && value <= 0.09 && this.#n.getNumberOfDigits() === 2) {
      return new PctStopOffsetValue(new ExactNum(value * 100));
    }
    return this;
  }

  /**
   * @param {number} digits
   * @returns {StopOffsetValue}
   */
  round(digits) {
    const value = toFixed(this.#n.getValue(), digits);
    return new NumericStopOffsetValue(new ExactNum(value)).getMinifiedValue();
  }
}

class PctStopOffsetValue extends StopOffsetValue {
  #n;

  /**
   * @param {ExactNum} n
   */
  constructor(n) {
    super(undefined);
    this.#n = n;
  }

  generateString() {
    return this.#n.getMinifiedString() + '%';
  }

  getMinifiedValue() {
    const pct = this.#n.getValue();
    // Use % if it can be represented as a single digit.
    if (pct >= 1 && pct <= 9 && Number.isInteger(pct)) {
      return this;
    }
    return new NumericStopOffsetValue(new ExactNum(pct / 100));
  }

  /**
   * @param {number} digits
   * @returns {StopOffsetValue}
   */
  round(digits) {
    return new NumericStopOffsetValue(
      new ExactNum(this.#n.getValue() / 100),
    ).round(digits);
  }
}
