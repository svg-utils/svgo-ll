export class DataType {
  /**
   * @param {string} _value
   * @returns {DataType}
   * @virtual
   */
  static parse(_value) {
    throw new Error();
  }

  /**
   * @param {number} _numDigits
   * @returns {DataType}
   */
  round(_numDigits) {
    throw new Error();
  }
}
