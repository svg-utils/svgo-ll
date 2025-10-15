import { ExactNum } from '../exactnum.js';
import { AttValueDeprecated } from './attValueDeprecated.js';

/**
 * @deprecated - use Percentage
 */
export class PctValue extends AttValueDeprecated {
  #n;

  /**
   * @param {ExactNum} n
   */
  constructor(n) {
    super(undefined);
    this.#n = n;
  }

  generateString() {
    return this.#n.getMinifiedString() + '%';
  }

  getMinifiedValue() {
    const pct = this.#n.getValue();
    // Use % if it can be represented as a single digit.
    if (pct >= 1 && pct <= 9 && Number.isInteger(pct)) {
      return this;
    }
    return new ExactNum(pct / 100);
  }

  /**
   * @returns {null}
   */
  getPixels() {
    return null;
  }

  /**
   * @param {number} numDigits
   * @returns {PctValue}
   */
  round(numDigits) {
    return new PctValue(
      new ExactNum((this.#n.getValue() / 100).toFixed(numDigits)),
    );
  }
}
