import { AttValue } from './attvalue.js';

export class PathAttValue extends AttValue {
  #isMinified;

  /**
   * @param {string} value
   * @param {boolean} [isMinified=false]
   */
  constructor(value, isMinified = false) {
    super(value);
    this.#isMinified = isMinified;
  }

  /**
   * @returns {boolean}
   */
  isMinified() {
    return this.#isMinified;
  }

  /**
   * @param {import('./types.js').SVGAttValue} attValue
   */
  static isMinified(attValue) {
    return attValue instanceof PathAttValue
      ? attValue.isMinified() === true
      : false;
  }
}
