export class AttValue {
  #value;

  /**
   *
   * @param {string} [value]
   */
  constructor(value) {
    this.#value = value;
  }

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
   * @param {import("../types.js").XastElement} _element
   * @param {string} [_attName]
   * @returns {AttValue|undefined}
   */
  static getAttValue(_element, _attName) {
    throw new Error();
  }

  /**
   * @template {AttValue} T
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @param {function(string):T} fnCreate
   * @returns {T|undefined}
   */
  static getAttValueGeneric(element, attName, fnCreate) {
    /** @type {string|T|undefined} */
    let value = element.svgAtts.get(attName);
    if (typeof value === 'string') {
      value = fnCreate(value);
      element.svgAtts.set(attName, value);
    }
    return value;
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
   */
  toString() {
    if (this.#value === undefined) {
      throw new Error();
    }
    return this.#value;
  }

  toStyleAttString() {
    return this.toString();
  }

  toStyleElementString() {
    return this.toStyleAttString();
  }
}
