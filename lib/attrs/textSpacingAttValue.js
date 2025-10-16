import { isDigit } from '../svgo/utils.js';
import { LengthAttValue } from './lengthAttValue.js';

export class TextSpacingAttValue extends LengthAttValue {
  /**
   * @param {string} value
   */
  constructor(value) {
    super(value === 'normal' ? '0' : value);
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {TextSpacingAttValue|undefined}
   */
  static getAttValue(element, attName) {
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new TextSpacingAttValue(value),
    );
  }

  /**
   * @returns {string}
   */
  toStyleElementString() {
    const s = this.toString();
    // Add px to numbers if no units specified.
    return isDigit(s[s.length - 1]) ? s + 'px' : s;
  }
}
