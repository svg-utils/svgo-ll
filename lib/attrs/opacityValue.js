import { minifyNumber } from '../svgo/tools.js';
import { AttValueDeprecated } from './attValueDeprecated.js';

export class OpacityValue extends AttValueDeprecated {
  /** @type {string|undefined} */
  #strVal;
  /** @type {number|undefined} */
  #opacity;

  /**
   * @param {string|undefined} strVal
   * @param {number} [opacity]
   */
  constructor(strVal, opacity) {
    super(strVal);
    this.#opacity = opacity;
  }

  /**
   * @returns {number}
   */
  getOpacity() {
    if (this.#opacity === undefined) {
      // If opacity is not set, set it from the original string.
      this.#opacity = parseFloat(super.toString());
    }
    return this.#opacity;
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {OpacityValue}
   */
  static getOpacityObj(value) {
    if (typeof value === 'string') {
      return new OpacityValue(value);
    }
    if (value instanceof OpacityValue) {
      return value;
    }
    throw new Error(value.toString());
  }

  /**
   * Override parent method to insure string is minified.
   * @returns {string}
   */
  toString() {
    if (this.#strVal === undefined) {
      // Minified string hasn't been generated yet.
      this.#strVal = minifyNumber(this.getOpacity());
    }
    return this.#strVal;
  }
}
