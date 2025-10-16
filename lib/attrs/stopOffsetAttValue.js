import { ExactNum } from '../exactnum.js';
import { isNumber } from '../svgo/tools.js';
import { AttValue } from './attValue.js';

export class StopOffsetAttValue extends AttValue {
  /** @type {ExactNum} */
  #value;
  /** @type {string|undefined} */
  #strValue;

  /**
   * @param {string|ExactNum} value
   */
  constructor(value) {
    super();
    if (typeof value === 'string') {
      value = value.trim();
      if (value.endsWith('%')) {
        this.#value = new ExactNum(
          parseFloat(value.substring(0, value.length - 1)) / 100,
        );
      } else if (isNumber(value)) {
        this.#value = new ExactNum(value);
      } else {
        throw new Error();
      }
    } else {
      this.#value = value;
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {StopOffsetAttValue|undefined}
   */
  static getAttValue(element) {
    /** @type {string|StopOffsetAttValue|undefined} */
    let value = element.svgAtts.get('offset');
    if (typeof value === 'string') {
      value = new StopOffsetAttValue(value);
      element.svgAtts.set('offset', value);
    }
    return value;
  }

  /**
   * @param {number} numDigits
   * @returns {StopOffsetAttValue}
   */
  round(numDigits) {
    if (!this.#value) {
      return this;
    }
    return new StopOffsetAttValue(this.#value.round(numDigits));
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#strValue === undefined) {
      // Use a single digit percentage if possible.
      if (this.#value.getNumberOfDigits() === 2) {
        const value = this.#value.getValue();
        if (value < 0.1 && value > 0) {
          this.#strValue = `${value * 100}%`;
        }
      }
    }
    if (this.#strValue === undefined) {
      this.#strValue = this.#value.getMinifiedString();
    }
    return this.#strValue;
  }
}
