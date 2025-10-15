import { Color } from '../types/color.js';
import { AttValue } from './attValue.js';
import { UrlAttValue } from './urlAttValue.js';

export class PaintAttValue extends AttValue {
  /** @type {UrlAttValue|undefined} */
  #urlAttValue;
  /** @type {Color|undefined} */
  #color;

  /**
   * @param {string|undefined} strValue
   * @param {Color|undefined} [colorValue]
   * @param {UrlAttValue|undefined} [urlValue]
   */
  constructor(strValue, colorValue, urlValue) {
    super();
    if (strValue !== undefined) {
      strValue = strValue.trim();
      if (strValue.startsWith('url(')) {
        const urlStr = strValue.slice(0, strValue.indexOf(')') + 1);
        this.#urlAttValue = new UrlAttValue(urlStr);
        strValue = strValue.substring(urlStr.length).trim();
      }
      if (strValue.length > 0) {
        this.#color = Color.parseColor(strValue);
      }
    } else {
      this.#urlAttValue = urlValue;
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

  /**
   * @returns {PaintAttValue}
   */
  getMinifiedValue() {
    return this.#color
      ? new PaintAttValue(
          undefined,
          this.#color.getMinifiedValue(),
          this.#urlAttValue,
        )
      : this;
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

  /**
   * @returns {PaintAttValue}
   */
  round() {
    return this.#color
      ? new PaintAttValue(undefined, this.#color.round(), this.#urlAttValue)
      : this;
  }

  toString() {
    let str;
    if (this.#urlAttValue) {
      str = this.#urlAttValue.toString();
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
