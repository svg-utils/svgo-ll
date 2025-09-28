import { LengthValue } from './lengthValue.js';
import { PctValue } from './pctValue.js';

export class LengthOrPctValue {
  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {LengthValue|PctValue|undefined}
   */
  static getAttValue(element, attName) {
    const value = element.attributes[attName];
    if (typeof value === 'object') {
      // @ts-ignore
      return value;
    }
    const obj = this.getLengthOrPctObj(value);
    element.attributes[attName] = obj;
    return obj;
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {LengthValue|PctValue}
   */
  static getLengthOrPctObj(value) {
    if (typeof value === 'string') {
      const v = value.trim();
      if (v.endsWith('%')) {
        const pct = PctValue.createPctValue(v);
        if (pct) {
          return pct;
        }
      }
    }

    return LengthValue.getObj(value);
  }
}
