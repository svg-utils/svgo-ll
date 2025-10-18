import { ExactNum } from '../exactnum.js';
import { AttValue } from './attValue.js';

export class OpacityAttValue extends AttValue {
  /** @type {ExactNum|undefined} */
  #opacity;

  /**
   * @param {string|ExactNum} value
   */
  constructor(value) {
    super(typeof value === 'string' ? value : undefined);
    this.#opacity = this.isGlobalKeyword()
      ? undefined
      : typeof value === 'string'
        ? new ExactNum(value)
        : value;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {OpacityAttValue|undefined}
   */
  static getAttValue(element, attName) {
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new OpacityAttValue(value),
    );
  }

  /**
   * @param {number} numDigits
   * @returns {OpacityAttValue}
   */
  round(numDigits) {
    if (this.#opacity === undefined) {
      return this;
    }
    const value = this.#opacity.getValue();
    if (value > 1) {
      return new OpacityAttValue(new ExactNum(1));
    }
    if (value < 0) {
      return new OpacityAttValue(new ExactNum(0));
    }
    return new OpacityAttValue(this.#opacity.round(numDigits));
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#opacity === undefined) {
      return super.toString();
    }
    return this.#opacity.getMinifiedString();
  }
}
