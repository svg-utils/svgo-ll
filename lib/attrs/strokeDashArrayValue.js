import { AttValue } from './attValue.js';
import { LengthOrPctValue } from './lengthOrPct.js';

/**
 * @typedef {(import('../types.js').LengthValue|import('../types.js').PctValue)[]} DashArray
 */

export class StrokeDasharrayValue extends AttValue {
  /** @type {DashArray} */
  #array;

  /**
   * @param {DashArray|string} value
   */
  constructor(value) {
    super();
    if (typeof value === 'string') {
      this.#array = value
        .trim()
        .replaceAll(',', ' ')
        .split(/\s+/)
        .map((item) => LengthOrPctValue.getLengthOrPctObj(item));
    } else {
      this.#array = value;
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
    return this.#array.map((item) => item.toString()).join(' ');
  }
}
