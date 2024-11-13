import { LengthValue } from './length.js';

export class LengthOrPctValue {
  /**
   * @param {import('./types.js').SVGAttValue} value
   * @returns {LengthValue}
   */
  static getLengthOrPctObj(value) {
    return LengthValue.getLengthObj(value);
  }
}
