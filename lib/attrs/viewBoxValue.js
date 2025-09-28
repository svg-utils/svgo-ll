import { ExactNum } from '../exactnum.js';
import { AttValue } from './attValue.js';

export class ViewBoxValue extends AttValue {
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
   * @returns {ViewBoxValue|undefined}
   */
  static getAttValue(element) {
    if (typeof element.attributes['viewBox'] === 'string') {
      element.attributes['viewBox'] = this.getObj(
        element.attributes['viewBox'],
      );
    }
    // @ts-ignore
    return element.attributes['viewBox'];
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {ViewBoxValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new ViewBoxValue(value);
    }
    // @ts-ignore
    return value;
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
