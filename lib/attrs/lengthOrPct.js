import { LengthValue } from './lengthValue.js';
import { PctValue } from './pctValue.js';

export class LengthOrPctValue {
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

    return LengthValue.getLengthObj(value);
  }
}
