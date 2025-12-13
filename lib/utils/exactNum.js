import { getNumberOfDecimalDigits, toFixed } from '../svgo/tools.js';

export class ExactNum {
  /** @type {string|undefined} */
  #str;
  /** @type {number|undefined} */
  #value;
  /** @type {number|undefined} */
  #numDigits;
  /** @type {string|undefined} */
  #minifiedString;

  /**
   * @param {string|number} n
   */
  constructor(n) {
    if (typeof n === 'string') {
      this.#str = n;
    } else {
      this.#value = n;
    }
  }

  /**
   * @param {ExactNum|undefined} n
   * @returns {ExactNum|undefined}
   */
  add(n) {
    if (n === undefined) {
      return;
    }
    const ret = this.clone();
    return ret.#incr(n);
  }

  /**
   * @deprecated = should not be needed (except internally) since class is immutable
   */
  clone() {
    const n = new ExactNum('');
    n.#str = this.#str;
    n.#value = this.#value;
    n.#numDigits = this.#numDigits;
    n.#minifiedString = this.#minifiedString;
    return n;
  }

  #generateMinifiedString() {
    const val = this.getValue();

    const roundedValue = toFixed(val, this.getNumberOfDigits());

    // Use exponential if it is shorter.
    if (roundedValue !== 0 && roundedValue < 0.001 && roundedValue > -0.001) {
      return roundedValue.toExponential();
    }

    // Otherwise trim leading 0 from before the decimal if there is one.
    const strValue = roundedValue.toString();
    if (0 < roundedValue && roundedValue < 1 && strValue.startsWith('0')) {
      return strValue.slice(1);
    }
    if (-1 < roundedValue && roundedValue < 0 && strValue[1] === '0') {
      return strValue[0] + strValue.slice(2);
    }
    return strValue;
  }

  getMinifiedString() {
    if (this.#minifiedString === undefined) {
      this.#minifiedString = this.#generateMinifiedString();
    }
    return this.#minifiedString;
  }

  getNumberOfDigits() {
    if (this.#numDigits === undefined) {
      this.#numDigits = getNumberOfDecimalDigits(this.#getString());
    }
    return this.#numDigits;
  }

  #getString() {
    if (this.#str === undefined) {
      if (this.#value === undefined) {
        // One or the other should always be defined; should never get here.
        throw new Error();
      }
      this.#str = this.#value.toString();
    }
    return this.#str;
  }

  getValue() {
    if (this.#value === undefined) {
      this.#value = parseFloat(this.#getString());
    }
    return this.#value;
  }

  /**
   * @param {ExactNum} n
   * @param {boolean} [decrement=false]
   * @returns {ExactNum|undefined}
   */
  #incr(n, decrement = false) {
    const value = this.getValue();
    const origNumDigits = this.getNumberOfDigits();
    const incrNumDigits = n.getNumberOfDigits();
    this.#str = this.#minifiedString = undefined;
    if (decrement) {
      this.#value = value - n.getValue();
    } else {
      this.#value = value + n.getValue();
    }
    this.#numDigits = getNumberOfDecimalDigits(this.#getString());

    // Make sure the number of decimal digits is reasonable based on the inputs.
    const expectedDigits = Math.max(origNumDigits, incrNumDigits);
    if (this.#numDigits < expectedDigits) {
      // The only way to lose decimals is when adding 2 numbers with same precision - e.g. .4 + .6
      return origNumDigits === incrNumDigits ? this : undefined;
    }
    if (this.#numDigits > expectedDigits) {
      // Assume there's a rounding error and set to expected digits.
      this.#str = this.#value.toFixed(expectedDigits);
      this.#minifiedString = undefined;
      this.#numDigits = getNumberOfDecimalDigits(this.#getString());
    }
    return this;
  }

  /**
   * @param {ExactNum} n
   * @returns{boolean}
   */
  isEqualTo(n) {
    return this.getMinifiedString() === n.getMinifiedString();
  }

  isZero() {
    return this.getMinifiedString() === '0';
  }

  /**
   * @param {ExactNum} n
   * @returns {ExactNum|undefined}
   */
  mul(n) {
    const digits = this.getNumberOfDigits() + n.getNumberOfDigits();
    if (digits > 12) {
      return;
    }
    const result = new ExactNum(this.getValue() * n.getValue()).round(digits);
    return result;
  }

  /**
   * @returns {ExactNum}
   */
  negate() {
    const ret = new ExactNum(-this.getValue());
    ret.#numDigits = this.#numDigits;
    return ret;
  }

  /**
   * @param {number} numDigits
   * @returns {ExactNum}
   */
  round(numDigits) {
    return new ExactNum(toFixed(this.getValue(), numDigits));
  }

  /**
   * @param {ExactNum} n
   * @returns {ExactNum|undefined}
   */
  sub(n) {
    const ret = this.clone();
    return ret.#incr(n, true);
  }

  /**
   * @returns {ExactNum}
   */
  static zero() {
    const ret = new ExactNum(0);
    ret.#numDigits = 0;
    ret.#str = ret.#minifiedString = '0';
    return ret;
  }
}
