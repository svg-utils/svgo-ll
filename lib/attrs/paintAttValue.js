import { AttValue } from './attValue.js';
import { ColorValue } from './colorValue.js';
import { UrlAttValue } from './urlAttValue.js';

export class PaintAttValue extends AttValue {
  /** @type {UrlAttValue|undefined} */
  #urlAttValue;
  /** @type {ColorValue|undefined} */
  #color;

  /**
   * @param {string|undefined} strValue
   * @param {ColorValue|undefined} [colorValue]
   */
  constructor(strValue, colorValue) {
    super();
    if (strValue !== undefined) {
      strValue = strValue.trim();
      if (strValue.startsWith('url(')) {
        this.#urlAttValue = new UrlAttValue(strValue);
      } else {
        this.#color = ColorValue.getColorObj(strValue);
      }
    } else if (colorValue !== undefined) {
      this.#color = colorValue;
    } else {
      throw new Error();
    }
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {PaintAttValue|undefined}
   */
  static getAttValue(element, attName) {
    let value = element.attributes[attName];
    if (typeof value !== 'string') {
      // @ts-ignore
      return value;
    }
    const pv = new PaintAttValue(value);
    element.attributes[attName] = pv;
    return pv;
  }

  /**
   * @returns {PaintAttValue}
   */
  getMinifiedValue() {
    return this.#color
      ? new PaintAttValue(undefined, this.#color.getMinifiedValue())
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

  toString() {
    if (this.#urlAttValue) {
      return this.#urlAttValue.toString();
    }
    if (this.#color) {
      return this.#color.toString();
    }
    throw new Error();
  }
}
