import { AttValue } from './attValue.js';
import { ExactNum } from '../exactnum.js';

export class StdDeviationValue extends AttValue {
  /** @type {[import('../types.js').ExactNum,import('../types.js').ExactNum]} */
  #stdDeviation;
  /** @type {string|undefined} */
  #strVal;

  /**
   * @param {string|[ExactNum,ExactNum]} value
   */
  constructor(value) {
    super();
    if (typeof value !== 'string') {
      this.#stdDeviation = value;
    } else {
      const sd = value.split(/,|\s+/).map((n) => new ExactNum(n));
      // @ts-ignore
      this.#stdDeviation = sd.length === 2 ? sd : [sd[0], sd[0]];
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {StdDeviationValue|undefined}
   */
  static getAttValue(element) {
    if (typeof element.attributes['stdDeviation'] === 'string') {
      element.attributes['stdDeviation'] = this.getObj(
        element.attributes['stdDeviation'],
      );
    }
    // @ts-ignore
    return element.attributes['stdDeviation'];
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
    return new StdDeviationValue(
      // @ts-ignore
      this.#stdDeviation.map((n) => n.round(numDigits)),
    );
  }

  /**
   * Override parent method to insure string is minified.
   * @returns {string}
   */
  toString() {
    return this.#getString();
  }
}
