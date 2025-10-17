import { AttValue } from './attValue.js';
import { ExactNum } from '../exactnum.js';

export class StdDeviationAttValue extends AttValue {
  /** @type {ExactNum[]} */
  #stdDeviation;
  /** @type {string|undefined} */
  #strVal;

  /**
   * @param {string|ExactNum[]} value
   */
  constructor(value) {
    super();
    if (typeof value !== 'string') {
      this.#stdDeviation = value;
    } else {
      const sd = value.split(/,|\s+/).map((n) => new ExactNum(n));
      this.#stdDeviation = sd.length === 2 ? sd : [sd[0], sd[0]];
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {StdDeviationAttValue|undefined}
   */
  static getAttValue(element) {
    return this.getAttValueGeneric(
      element,
      'stdDeviation',
      (value) => new StdDeviationAttValue(value),
    );
  }

  /**
   * @param {number} numDigits
   * @returns {StdDeviationAttValue}
   */
  round(numDigits) {
    return new StdDeviationAttValue(
      this.#stdDeviation.map((n) => n.round(numDigits)),
    );
  }

  /**
   * Override parent method to insure string is minified.
   * @returns {string}
   */
  toString() {
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
}
