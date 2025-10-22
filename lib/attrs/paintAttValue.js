import { Color } from '../types/color.js';
import { PresentationAttUrl } from '../types/presentationAttUrl.js';
import { AttValue } from './attValue.js';

export class PaintAttValue extends AttValue {
  /** @type {PresentationAttUrl|undefined} */
  #url;
  /** @type {Color|undefined} */
  #color;

  /**
   * @param {string|undefined} strValue
   * @param {boolean} [isImportant]
   * @param {Color|undefined} [colorValue]
   * @param {PresentationAttUrl|undefined} [urlValue]
   */
  constructor(strValue, isImportant, colorValue, urlValue) {
    super(undefined, isImportant);
    if (strValue !== undefined) {
      strValue = strValue.trim();
      if (strValue.startsWith('url(')) {
        const urlStr = strValue.slice(0, strValue.indexOf(')') + 1);
        this.#url = new PresentationAttUrl(urlStr);
        strValue = strValue.substring(urlStr.length).trim();
      }
      if (strValue.length > 0) {
        this.#color = Color.parse(strValue);
      }
    } else {
      this.#url = urlValue;
      this.#color = colorValue;
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {PaintAttValue|undefined}
   */
  static getAttValue(element, attName) {
    let value = element.svgAtts.get(attName);
    if (typeof value !== 'string') {
      // @ts-ignore
      return value;
    }
    const pv = new PaintAttValue(value);
    element.svgAtts.set(attName, pv);
    return pv;
  }

  getColor() {
    return this.#color;
  }

  /**
   * @returns {PaintAttValue}
   */
  getMinifiedValue() {
    return this.#color
      ? new PaintAttValue(
          undefined,
          this.isImportant(),
          this.#color.getMinifiedValue(),
          this.#url,
        )
      : this;
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

  /**
   * @returns {PaintAttValue}
   */
  round() {
    return this.#color
      ? new PaintAttValue(
          undefined,
          this.isImportant(),
          this.#color.round(),
          this.#url,
        )
      : this;
  }

  toString() {
    let str;
    if (this.#url) {
      str = this.#url.toString();
    }
    if (this.#color) {
      const colorStr = this.#color.toString();
      str = str === undefined ? colorStr : str + ' ' + colorStr;
    }
    if (str === undefined) {
      throw new Error();
    }
    return str;
  }
}
