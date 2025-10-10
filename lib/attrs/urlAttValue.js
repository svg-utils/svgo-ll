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
    const literalString = match[2];
    this.#url = decodeURIComponent(literalString);
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
    return `url(${this.#url})`;
  }
}
