import { parsePathCommands } from '../pathutils.js';
import { AttValue } from './attValue.js';

export class PathAttValue extends AttValue {
  #strValue;
  #isMinified;
  #isRounded;

  /**
   * @param {string} value
   * @param {boolean} [isMinified=false]
   * @param {boolean} [isRounded=false]
   */
  constructor(value, isMinified = false, isRounded = false) {
    super();
    this.#strValue = value;
    this.#isMinified = isMinified;
    this.#isRounded = isRounded;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @return {PathAttValue|undefined}
   */
  static getAttValue(element) {
    let value = element.svgAtts.get('d');
    if (typeof value === 'string') {
      value = new PathAttValue(value);
      element.svgAtts.set('d', value);
    }
    // @ts-ignore
    return value;
  }

  /**
   * @returns {import('../pathutils.js').PathCommand[]}
   */
  getParsedPath() {
    return parsePathCommands(this.#strValue);
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

  toString() {
    return this.#strValue;
  }
}
