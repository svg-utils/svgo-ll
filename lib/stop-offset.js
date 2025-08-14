import { AttValue } from './attvalue.js';
import { ExactNum } from './exactnum.js';
import { NumericValue, PctValue } from './numericvalue.js';
import { isNumber } from './svgo/tools.js';

export class StopOffsetValue extends AttValue {
  /**
   * @param {string|undefined} strVal
   */
  constructor(strVal) {
    super(strVal);
  }

  /**
   * @param {string} value
   * @returns {StopOffsetValue|PctValue|NumericValue}
   */
  static #createStopOffsetObj(value) {
    value = value.trim();
    if (value.endsWith('%')) {
      const pct = PctValue.createPctValue(value);
      if (pct) {
        return pct;
      }
    } else {
      if (isNumber(value)) {
        return new NumericValue(new ExactNum(value));
      }
    }
    return new StopOffsetValue(value);
  }

  /**
   * @param {string|import('./types.js').AttValue} value
   * @returns {StopOffsetValue|PctValue|NumericValue}
   */
  static getStopOffsetObj(value) {
    if (typeof value === 'string') {
      return this.#createStopOffsetObj(value);
    }
    if (
      value instanceof StopOffsetValue ||
      value instanceof PctValue ||
      value instanceof NumericValue
    ) {
      return value;
    }
    throw new Error(value.toString());
  }

  /**
   * @returns {StopOffsetValue}
   */
  getMinifiedValue() {
    return this;
  }

  /**
   * @param {number} digits
   * @returns {AttValue}
   */
  // eslint-disable-next-line no-unused-vars
  round(digits) {
    return this;
  }
}
