import { minifyNumber } from '../svgo/tools.js';
import { AttValue } from './attValue.js';

export class OpacityValue extends AttValue {
  /** @type {string|undefined} */
  #strVal;
  /** @type {number|undefined} */
  #opacity;

  /**
   * @param {string|undefined} strVal
   * @param {number} [opacity]
   */
  constructor(strVal, opacity) {
    super();
    this.#strVal = strVal;
    this.#opacity = opacity;
  }

  /**
   * @returns {number}
   */
  getOpacity() {
    if (this.#opacity === undefined) {
      // If opacity is not set, set it from the original string.
      // @ts-ignore - at least one must be defined
      this.#opacity = parseFloat(this.#strVal);
    }
    return this.#opacity;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {OpacityValue|undefined}
   */
  static getAttValue(element, attName) {
    if (typeof element.attributes[attName] !== 'string') {
      // @ts-ignore
      return element.attributes[attName];
    }
    const value = this.getObj(element.attributes[attName]);
    element.attributes[attName] = value;
    return value;
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {OpacityValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return value === 'inherit'
        ? new OpacityValue('inherit')
        : new OpacityValue(undefined, parseFloat(value));
    }
    // @ts-ignore
    return value;
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
