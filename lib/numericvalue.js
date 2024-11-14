import { AttValue } from './attvalue.js';
import { ExactNum } from './exactnum.js';
import { isNumber, toFixed } from './svgo/tools.js';

export class NumericValue extends AttValue {
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
      return new PctValue(new ExactNum(value * 100));
    }
    return this;
  }

  /**
   * @param {number} digits
   * @returns {AttValue}
   */
  round(digits) {
    const value = toFixed(this.#n.getValue(), digits);
    return new NumericValue(new ExactNum(value)).getMinifiedValue();
  }
}

export class PctValue extends AttValue {
  #n;

  /**
   * @param {ExactNum} n
   */
  constructor(n) {
    super(undefined);
    this.#n = n;
  }

  /**
   * @param {string} value
   * @returns {PctValue|undefined}
   */
  static createPctValue(value) {
    const pct = value.substring(0, value.length - 1);
    if (isNumber(pct)) {
      return new PctValue(new ExactNum(pct));
    }
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
    return new NumericValue(new ExactNum(pct / 100));
  }

  /**
   * @param {number} digits
   * @returns {AttValue}
   */
  round(digits) {
    return new NumericValue(new ExactNum(this.#n.getValue() / 100)).round(
      digits,
    );
  }
}
