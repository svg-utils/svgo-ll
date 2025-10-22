import { AttValue } from './attValue.js';
import { Length } from '../types/lengthPercentage.js';

export class LengthAttValue extends AttValue {
  #value;
  /** @type {string|undefined} */
  #strValue;

  /**
   * @param {string|import('../../types/types.js').ExactNum} value
   * @param {boolean} [isImportant]
   */
  constructor(value, isImportant) {
    super(undefined, isImportant);
    this.#value = new Length(value);
  }

  toString() {
    if (this.#strValue === undefined) {
      this.#strValue = this.#value.toString();
    }
    return this.#strValue;
  }
}
