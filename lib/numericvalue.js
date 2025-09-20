import { AttValue } from './attvalue.js';
import { ExactNum } from './exactnum.js';
import { isNumber } from './svgo/tools.js';

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
    return new ExactNum(pct / 100);
  }

  /**
   * @param {number} numDigits
   * @returns {PctValue}
   */
  round(numDigits) {
    return new PctValue(
      new ExactNum((this.#n.getValue() / 100).toFixed(numDigits)),
    );
  }
}
