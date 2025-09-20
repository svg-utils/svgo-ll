import { AttValue } from './attValue.js';
import { ExactNum } from '../exactnum.js';
import { isNumber } from '../svgo/tools.js';

export class StopOffsetValue extends AttValue {
  #value;
  /**
   * @param {string|ExactNum} value
   */
  constructor(value) {
    super(typeof value === 'string' ? value : undefined);
    if (typeof value === 'string') {
      value = value.trim();
      if (value.endsWith('%')) {
        this.#value = new ExactNum(
          parseFloat(value.substring(0, value.length - 1)) / 100,
        );
      } else if (isNumber(value)) {
        this.#value = new ExactNum(value);
      }
    } else {
      this.#value = value;
    }
  }

  /**
   * @param {string|import('../types.js').AttValue} value
   * @returns {StopOffsetValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new StopOffsetValue(value);
    }
    // @ts-ignore
    return value;
  }

  /**
   * @param {number} numDigits
   * @returns {StopOffsetValue}
   */
  round(numDigits) {
    if (!this.#value) {
      return this;
    }
    return new StopOffsetValue(this.#value.round(numDigits));
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#value === undefined) {
      return super.toString();
    }
    // Use a single digit percentage if possible.
    if (this.#value.getNumberOfDigits() === 2) {
      const value = this.#value.getValue();
      if (value < 0.1 && value > 0) {
        return `${value * 100}%`;
      }
    }
    return this.#value.getMinifiedString();
  }
}
