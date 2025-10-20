import { LengthPercentageAttValue } from './lengthPercentageAttValue.js';

export class LengthPercentageAutoAttValue extends LengthPercentageAttValue {
  #isAuto;

  /**
   * @param {string} value
   */
  constructor(value) {
    const isAuto = value.trim().toLowerCase() === 'auto';
    super(isAuto ? '0' : value);
    this.#isAuto = isAuto;
  }

  toString() {
    return this.#isAuto ? 'auto' : super.toString();
  }
}
