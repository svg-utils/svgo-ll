import { AttValue } from './attValue.js';
import { Length } from '../types/lengthPercentage.js';

export class LengthAttValue extends AttValue {
  #value;
  /** @type {string|undefined} */
  #strValue;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.#value = new Length(value);
  }

  toString() {
    if (this.#strValue === undefined) {
      this.#strValue = this.#value.toString();
    }
    return this.#strValue;
  }
}
