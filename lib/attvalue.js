export class AttValue {
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
   * @returns {string}
   */
  toString() {
    if (this.#strVal === undefined) {
      this.#strVal = this.generateString();
    }
    return this.#strVal;
  }
}
