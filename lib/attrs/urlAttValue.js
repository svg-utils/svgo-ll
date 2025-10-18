import { Url } from '../types/url.js';
import { AttValue } from './attValue.js';

const RE_ATT_URL = /\s*url\(\s*(["'])?([^)\s"']+)\1\s*\)/;

export class UrlAttValue extends AttValue {
  #url;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    const match = RE_ATT_URL.exec(value);
    if (match === null) {
      throw new Error(`unable to parse url "${value}"`);
    }
    this.#url = new Url(match[2]);
  }

  /**
   * @returns {string|undefined}
   */
  getID() {
    return this.#url.getID();
  }

  toString() {
    return `url(${this.#url.toString()})`;
  }
}
