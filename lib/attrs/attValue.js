const GLOBAL_KEYWORDS = new Set(['inherit', 'revert', 'initial', 'unset']);

export class AttValue {
  #value;
  #isGlobalKeyword;
  #isImportant;

  /**
   * @param {string} [value]
   * @param {boolean} [isImportant=false]
   */
  constructor(value, isImportant = false) {
    this.#value = value;
    this.#isGlobalKeyword = value !== undefined && GLOBAL_KEYWORDS.has(value);
    this.#isImportant = isImportant;
  }

  /**
   * @param {string} value
   * @returns {import("../types.js").CSSGlobalKeyword|undefined}
   * @deprecated
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
   * @deprecated
   */
  static getAttValueGeneric(element, attName, fnCreate) {
    /** @type {T|undefined} */
    let value = element.svgAtts.get(attName);
    if (typeof value === 'string') {
      value = fnCreate(value);
      element.svgAtts.set(attName, value);
      throw new Error();
    }
    return value;
  }

  /**
   * @param {string|AttValue} _value
   * @returns {AttValue}
   * @abstract
   * @deprecated
   */
  static getObj(_value) {
    throw new Error();
  }

  /**
   * @returns {string|undefined}
   */
  getReferencedID() {
    return;
  }

  isGlobalKeyword() {
    return this.#isGlobalKeyword;
  }

  /**
   * @returns {boolean}
   */
  isImportant() {
    return this.#isImportant;
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
