import { isDigit } from '../svgo/utils.js';
import { LengthAttValue } from './lengthAttValue.js';

export class TextSpacingAttValue extends LengthAttValue {
  /**
   * @param {string} value
   * @param {boolean} [isImportant]
   */
  constructor(value, isImportant) {
    super(value === 'normal' ? '0' : value, isImportant);
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
