export class AttValue {
  /**
   * @param {number} _numDigits
   * @returns {import("../types.js").AttValue}
   */
  round(_numDigits) {
    return this;
  }

  /**
   * @param {string|AttValue} _value
   * @returns {AttValue}
   * @abstract
   */
  static getObj(_value) {
    throw new Error();
  }

  /**
   * @returns {string}
   * @abstract
   */
  toString() {
    throw new Error();
  }
}
