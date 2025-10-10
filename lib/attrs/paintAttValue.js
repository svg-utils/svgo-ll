import { AttValue } from './attValue.js';
import { UrlAttValue } from './urlAttValue.js';

export class PaintAttValue extends AttValue {
  /** @type {UrlAttValue|undefined} */
  #urlAttValue;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    value = value.trim();
    if (value.startsWith('url(')) {
      this.#urlAttValue = new UrlAttValue(value);
    }
  }
  /**
   * @param {string|AttValue} value
   * @returns {PaintAttValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new PaintAttValue(value);
    }
    // @ts-ignore
    return value;
  }

  /**
   * @returns {UrlAttValue|undefined}
   */
  getURL() {
    return this.#urlAttValue;
  }
}
