import { PresentationAttUrl } from '../types/presentationAttUrl.js';
import { AttValue } from './attValue.js';

export class MarkerAttValue extends AttValue {
  /** @type {PresentationAttUrl|undefined} */
  #url;

  /**
   * @param {string|undefined} strValue
   * @param {boolean} [isImportant]
   * @param {PresentationAttUrl|undefined} [urlValue]
   */
  constructor(strValue, isImportant, urlValue) {
    super(undefined, isImportant);
    if (strValue !== undefined) {
      strValue = strValue.trim();
      if (strValue === 'none') {
        return;
      }
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
  getReferencedID() {
    return this.#url?.getReferencedID();
  }

  /**
   * @returns {PresentationAttUrl|undefined}
   */
  getURL() {
    return this.#url;
  }

  toString() {
    return this.#url === undefined ? 'none' : this.#url.toString();
  }
}
