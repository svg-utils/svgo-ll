import { parsePathCommands, stringifyPathCommands } from '../pathutils.js';
import { AttValue } from './attValue.js';

export class PathAttValue extends AttValue {
  /** @type {string|undefined} */
  #strValue;
  /** @type {import('../pathutils.js').PathCommand[]|undefined} */
  #parsedValue;
  #isMinified;
  #isRounded;

  /**
   * @param {string|undefined} strValue
   * @param {import('../pathutils.js').PathCommand[]} [parsedValue]
   * @param {boolean} [isMinified=false]
   * @param {boolean} [isRounded=false]
   */
  constructor(strValue, parsedValue, isMinified = false, isRounded = false) {
    super();
    this.#strValue = strValue;
    this.#parsedValue = parsedValue;
    this.#isMinified = isMinified;
    this.#isRounded = isRounded;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @return {PathAttValue|undefined}
   */
  static getAttValue(element) {
    /** @type {string|PathAttValue|undefined} */
    let value = element.svgAtts.get('d');
    if (typeof value === 'string') {
      value = new PathAttValue(value);
      element.svgAtts.set('d', value);
    }
    return value;
  }

  /**
   * @returns {import('../pathutils.js').PathCommand[]}
   */
  getParsedPath() {
    if (this.#parsedValue === undefined) {
      if (this.#strValue === undefined) {
        throw new Error();
      }
      this.#parsedValue = parsePathCommands(this.#strValue);
    }
    return this.#parsedValue;
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
    if (this.#strValue === undefined) {
      if (this.#parsedValue === undefined) {
        throw new Error();
      }
      this.#strValue = stringifyPathCommands(this.#parsedValue);
    }
    return this.#strValue;
  }
}
