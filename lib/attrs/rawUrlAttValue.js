import { AttValue } from './attValue.js';

export class RawUrlAttValue extends AttValue {
  /** @type {string} */
  #url;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.#url = decodeURIComponent(value);
    if (this.#url.startsWith('data:')) {
      this.#url = this.#url.replaceAll('\n', '');
    }
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
