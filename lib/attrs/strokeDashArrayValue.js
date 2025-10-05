import { AttValue } from './attValue.js';
import { LengthOrPctValue } from './lengthOrPct.js';

/**
 * @typedef {import('../types.js').CSSGlobalKeyword|"none"|(import('../types.js').LengthValue|import('../types.js').PctValue)[]} DashArray
 */

export class StrokeDasharrayValue extends AttValue {
  /** @type {DashArray} */
  #value;
  /** @type {string|undefined} */
  #strValue;

  /**
   * @param {DashArray|string} value
   */
  constructor(value) {
    super();
    if (typeof value === 'string') {
      value = value.trim();
      const global = AttValue.getGlobalKeyword(value);
      if (global !== undefined) {
        this.#value = global;
      } else {
        this.#value =
          value === 'none'
            ? []
            : value
                .replaceAll(',', ' ')
                .split(/\s+/)
                .map((item) => LengthOrPctValue.getObj(item));
      }
    } else {
      this.#value = value;
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {StrokeDasharrayValue|undefined}
   */
  static getAttValue(element) {
    if (typeof element.attributes['stroke-dasharray'] === 'string') {
      element.attributes['stroke-dasharray'] = this.getObj(
        element.attributes['stroke-dasharray'],
      );
    }
    // @ts-ignore
    return element.attributes['stroke-dasharray'];
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {StrokeDasharrayValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new StrokeDasharrayValue(value);
    }
    // @ts-ignore
    return value;
  }

  toString() {
    if (this.#strValue === undefined) {
      if (typeof this.#value === 'string') {
        this.#strValue = this.#value;
      } else {
        this.#strValue =
          this.#value.length === 0
            ? 'none'
            : this.#value.map((item) => item.toString()).join(',');
      }
    }
    return this.#strValue;
  }
}
