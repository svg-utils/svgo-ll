import { ExactNum } from '../exactnum.js';
import { AttValue } from './attValue.js';

export class ViewBoxAttValue extends AttValue {
  /** @type {ExactNum[]} */
  #array;
  /** @type {string|undefined} */
  #strValue;

  /**
   * @param {ExactNum[]|string} value
   */
  constructor(value) {
    super();
    if (typeof value === 'string') {
      value = value.trim();
      this.#array =
        value === 'none'
          ? []
          : value
              .replaceAll(',', ' ')
              .split(/\s+/)
              .map((item) => new ExactNum(item));
    } else {
      this.#array = value;
    }
  }

  /**
   * @returns {ExactNum[]}
   */
  getCoordinates() {
    return this.#array;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {ViewBoxAttValue|undefined}
   */
  static getAttValue(element) {
    return this.getAttValueGeneric(
      element,
      'viewBox',
      (value) => new ViewBoxAttValue(value),
    );
  }

  toString() {
    if (this.#strValue === undefined) {
      this.#strValue = this.#array
        .map((item) => item.getMinifiedString())
        .join(' ');
    }
    return this.#strValue;
  }
}
