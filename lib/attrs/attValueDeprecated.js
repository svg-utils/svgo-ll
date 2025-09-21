/**
 * @deprecated
 */
export class AttValueDeprecated {
  #strVal;
  /**
   * @param {string|undefined} strVal
   */
  constructor(strVal) {
    this.#strVal = strVal;
  }

  /**
   * @returns {string}
   */
  generateString() {
    throw new Error();
  }

  /**
   * @param {number} numDigits
   * @returns {import("../types.js").AttValue}
   */
  // eslint-disable-next-line no-unused-vars
  round(numDigits) {
    return this;
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#strVal === undefined) {
      this.#strVal = this.generateString();
    }
    return this.#strVal;
  }
}
