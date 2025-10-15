import { AttValue } from './attValue.js';
import { LengthOrPctValue } from './lengthOrPct.js';

/**
 * @typedef {import('../types.js').CSSGlobalKeyword|"none"|(import('../types.js').LengthValue|import('../types.js').PctValue)[]} DashArray
 */

export class StrokeDasharrayAttValue extends AttValue {
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
   * @returns {StrokeDasharrayAttValue|undefined}
   */
  static getAttValue(element) {
    /** @type {string|StrokeDasharrayAttValue|undefined} */
    let value = element.svgAtts.get('stroke-dasharray');
    if (typeof value === 'string') {
      value = new StrokeDasharrayAttValue(value);
      element.svgAtts.set('stroke-dasharray', value);
    }
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
