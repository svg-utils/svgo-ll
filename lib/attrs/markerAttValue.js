import { PresentationAttUrl } from '../types/presentationAttUrl.js';
import { AttValue } from './attValue.js';

export class MarkerAttValue extends AttValue {
  /** @type {PresentationAttUrl} */
  #url;

  /**
   * @param {string|undefined} strValue
   * @param {PresentationAttUrl|undefined} [urlValue]
   */
  constructor(strValue, urlValue) {
    super();
    if (strValue !== undefined) {
      strValue = strValue.trim();
      if (!strValue.startsWith('url(')) {
        throw new Error(strValue);
      }
      this.#url = new PresentationAttUrl(strValue);
    } else if (urlValue !== undefined) {
      this.#url = urlValue;
    } else {
      throw new Error();
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {MarkerAttValue|undefined}
   */
  static getAttValue(element, attName) {
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new MarkerAttValue(value),
    );
  }

  /**
   * @returns {string|undefined}
   */
  getID() {
    return this.#url?.getID();
  }

  /**
   * @returns {PresentationAttUrl|undefined}
   */
  getURL() {
    return this.#url;
  }

  toString() {
    return this.#url.toString();
  }
}
