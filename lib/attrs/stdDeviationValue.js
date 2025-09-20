import { AttValue } from './attValue.js';
import { ExactNum } from '../exactnum.js';

export class StdDeviationValue extends AttValue {
  /** @type {string|undefined} */
  #strVal;
  /** @type {[import('../types.js').ExactNum,import('../types.js').ExactNum]|undefined} */
  #stdDeviation;

  /**
   * @param {string|undefined} strVal
   * @param {[number|ExactNum,number|ExactNum]} [stdDeviation]
   */
  constructor(strVal, stdDeviation) {
    super(strVal);
    this.#strVal = strVal;
    // @ts-ignore
    this.#stdDeviation = stdDeviation
      ? stdDeviation.map((n) => (typeof n === 'number' ? new ExactNum(n) : n))
      : undefined;
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {StdDeviationValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new StdDeviationValue(value);
    }
    // @ts-ignore
    return value;
  }

  /**
   * @returns {string}
   */
  #getString() {
    if (this.#strVal === undefined) {
      /** @type {[ExactNum,ExactNum]} */
      // @ts-ignore
      const sd = this.#stdDeviation;
      // Minified string hasn't been generated yet.
      this.#strVal = sd[0].isEqualTo(sd[1])
        ? sd[0].getMinifiedString()
        : `${sd[0].getMinifiedString()},${sd[1].getMinifiedString()}`;
    }
    return this.#strVal;
  }

  /**
   * @param {number} numDigits
   * @returns {StdDeviationValue}
   */
  round(numDigits) {
    if (!this.#stdDeviation) {
      const str = this.#getString();
      const sd = str.split(',').map((n) => new ExactNum(n).round(numDigits));
      // @ts-ignore
      this.#stdDeviation = sd.length === 2 ? sd : [sd[0], sd[0]];
    }
    // @ts-ignore
    return new StdDeviationValue(undefined, this.#stdDeviation);
  }

  /**
   * Override parent method to insure string is minified.
   * @returns {string}
   */
  toString() {
    return this.#getString();
  }
}
