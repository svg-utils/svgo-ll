import { getNumberOfDecimalDigits, toFixed } from './svgo/tools.js';

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
   * @param {ExactNum} n
   * @returns {ExactNum}
   */
  add(n) {
    const ret = this.clone();
    ret.incr(n);
    return ret;
  }

  clone() {
    const n = new ExactNum('');
    n.#str = this.#str;
    n.#value = this.#value;
    n.#numDigits = this.#numDigits;
    n.#minifiedString = this.#minifiedString;
    return n;
  }

  #generateMinifiedString() {
    const n = this.getValue();

    // Use exponential if it is shorter.
    if (n !== 0 && n < 0.001 && n > -0.001) {
      return n.toExponential();
    }

    // Otherwise trim leading 0 from before the decimal if there is one.
    const strValue = toFixed(n, this.getNumberOfDigits()).toString();
    if (0 < n && n < 1 && strValue.startsWith('0')) {
      return strValue.slice(1);
    }
    if (-1 < n && n < 0 && strValue[1] === '0') {
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
   */
  incr(n, decrement = false) {
    const value = this.getValue();
    const numDigits = this.getNumberOfDigits();
    this.#str = undefined;
    this.#minifiedString = undefined;
    if (decrement) {
      this.#value = value - n.getValue();
    } else {
      this.#value = value + n.getValue();
    }
    this.#numDigits = Math.max(numDigits, n.getNumberOfDigits());
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
   * @returns {ExactNum}
   */
  negate() {
    const ret = new ExactNum(-this.getValue());
    ret.#numDigits = this.#numDigits;
    return ret;
  }

  /**
   * @param {ExactNum} n
   * @returns {ExactNum}
   */
  sub(n) {
    const ret = this.clone();
    ret.incr(n, true);
    return ret;
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
