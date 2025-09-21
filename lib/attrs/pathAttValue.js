import { AttValueDeprecated } from './attValueDeprecated.js';

export class PathAttValue extends AttValueDeprecated {
  #isMinified;
  #isRounded;

  /**
   * @param {string} value
   * @param {boolean} [isMinified=false]
   * @param {boolean} [isRounded=false]
   */
  constructor(value, isMinified = false, isRounded = false) {
    super(value);
    this.#isMinified = isMinified;
    this.#isRounded = isRounded;
  }

  /**
   * @returns {boolean}
   */
  isMinified() {
    return this.#isMinified;
  }

  /**
   * @returns {boolean}
   */
  isRounded() {
    return this.#isRounded;
  }

  /**
   * @param {import('../types.js').SVGAttValue} attValue
   */
  static isMinified(attValue) {
    return attValue instanceof PathAttValue
      ? attValue.isMinified() === true
      : false;
  }

  /**
   * @param {boolean} isRounded
   */
  setRounded(isRounded) {
    this.#isRounded = isRounded;
  }
}
