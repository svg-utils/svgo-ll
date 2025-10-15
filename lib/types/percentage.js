import { ExactNum } from '../exactnum.js';

export class Percentage {
  #value;
  /** @type {string|undefined} */
  #strValue;

  /**
   * @param {ExactNum} value
   */
  constructor(value) {
    this.#value = value;
  }

  /**
   * @param {number} numDigits
   * @returns {Percentage}
   */
  round(numDigits) {
    return new Percentage(
      new ExactNum((this.#value.getValue() / 100).toFixed(numDigits)),
    );
  }

  toString() {
    if (this.#strValue === undefined) {
      this.#strValue = `${this.#value.getMinifiedString()}%`;
    }
    return this.#strValue;
  }
}
