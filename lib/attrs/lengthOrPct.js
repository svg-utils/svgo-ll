import { ExactNum } from '../exactnum.js';
import { AttValue } from './attValue.js';
import { LengthValue } from './lengthValue.js';
import { PctValue } from './pctValue.js';

export class LengthOrPctValue {
  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {import('../types.js').CSSGlobalKeyword|LengthValue|PctValue|undefined}
   */
  static getAttValue(element, attName) {
    const value = element.attributes[attName];
    if (typeof value === 'object') {
      // @ts-ignore
      return value;
    }
    const g = AttValue.getGlobalKeyword(value);
    if (g) {
      return g;
    }
    const obj = this.getObj(value);
    element.attributes[attName] = obj;
    return obj;
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {LengthValue|PctValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      const v = value.trim();
      if (v.endsWith('%')) {
        const pct = new PctValue(new ExactNum(v.substring(0, v.length - 1)));
        if (pct) {
          return pct;
        }
      }
    }

    return LengthValue.getObj(value);
  }
}
