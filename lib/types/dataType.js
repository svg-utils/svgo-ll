export class DataType {
  /**
   * @param {string} _value
   * @returns {DataType}
   * @virtual
   */
  static parse(_value) {
    throw new Error();
  }
}
