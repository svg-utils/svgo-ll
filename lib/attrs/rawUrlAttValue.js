import { AttValue } from './attValue.js';

export class RawUrlAttValue extends AttValue {
  #url;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.#url = decodeURIComponent(value);
  }

  /**
   * @returns {string|undefined}
   */
  getID() {
    return this.#url.startsWith('#') ? this.#url.slice(1) : undefined;
  }

  /**
   * @returns {string}
   */
  getURL() {
    return this.#url;
  }

  toString() {
    return this.#url;
  }
}
