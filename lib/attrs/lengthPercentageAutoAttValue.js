import { LengthPercentageAttValue } from './lengthPercentageAttValue.js';

export class LengthPercentageAutoAttValue extends LengthPercentageAttValue {
  #isAuto;

  /**
   * @param {string} value
   * @param {boolean} [isImportant]
   */
  constructor(value, isImportant) {
    const isAuto = value.trim().toLowerCase() === 'auto';
    super(isAuto ? '0' : value, isImportant);
    this.#isAuto = isAuto;
  }

  toString() {
    return this.#isAuto ? 'auto' : super.toString();
  }
}
