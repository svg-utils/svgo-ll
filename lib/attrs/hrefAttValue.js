import { Url } from '../types/url.js';
import { AttValue } from './attValue.js';

export class HrefAttValue extends AttValue {
  #url;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.#url = new Url(value);
  }

  /**
   * @returns {string|undefined}
   */
  getID() {
    return this.#url.getID();
  }

  /**
   * @returns {string}
   */
  getURL() {
    return this.#url.getURL();
  }

  toString() {
    return this.#url.toString();
  }
}
