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

export class OpacityValue extends AttValue {
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

  generateString() {
    if (this.#opacity === undefined) {
      throw new Error();
    }
    return this.#opacity.toString();
  }

  /**
   * @returns {number}
   */
  getOpacity() {
    if (this.#opacity === undefined) {
      this.#opacity = parseFloat(this.toString());
    }
    return this.#opacity;
  }

  /**
   * @param {string|AttValue} value
   * @returns {OpacityValue}
   */
  static getOpacityObj(value) {
    if (typeof value === 'string') {
      return new OpacityValue(value);
    }
    if (value instanceof OpacityValue) {
      return value;
    }
    throw value;
  }
}
