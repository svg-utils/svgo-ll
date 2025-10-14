import { AttValue } from './attValue.js';

export class ColorAttValue extends AttValue {
  #strValue;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.#strValue = value;
  }

  /**
   * @returns {ColorAttValue}
   */
  getMinifiedValue() {
    return this;
  }

  /**
   * @param {string|AttValue} value
   * @returns {ColorAttValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new ColorAttValue(value);
    }
    // @ts-ignore
    return value;
  }

  toString() {
    return this.#strValue;
  }
}
