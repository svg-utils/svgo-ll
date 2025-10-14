export class AttValue {
  /**
   * @param {string} value
   * @returns {import("../types.js").CSSGlobalKeyword|undefined}
   */
  static getGlobalKeyword(value) {
    switch (value) {
      case 'inherit':
      case 'revert':
      case 'initial':
      case 'unset':
        return value;
    }
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
   * @param {number} _numDigits
   * @returns {AttValue}
   */
  round(_numDigits) {
    return this;
  }

  /**
   * @returns {string}
   * @abstract
   */
  toString() {
    throw new Error();
  }

  toStyleAttString() {
    return this.toString();
  }

  toStyleElementString() {
    return this.toStyleAttString();
  }
}
