import { colorsNames, colorsShortNames } from '../../plugins/_collections.js';
import { DataType } from './dataType.js';

const REGEX_RGB = /rgb\((.*)\)/i;
const REGEX_RGB_ARGS = /\s|,/;

export class Color extends DataType {
  /**
   * @param {string} _value
   * @returns {Color|undefined}
   */
  static createObj(_value) {
    throw new Error();
  }

  /**
   * @returns {Color}
   */
  getMinifiedValue() {
    return this;
  }

  /**
   * @param {string} value
   * @returns {Color}
   */
  static parse(value) {
    value = value.trim();
    const lower = value.toLowerCase();

    const obj =
      HexColor.createObj(lower) ||
      ExtendedColor.createObj(lower) ||
      RGBColor.createObj(lower) ||
      new StringColor(value);
    return obj;
  }

  /**
   * @returns {Color}
   */
  round() {
    return this;
  }
}

class ExtendedColor extends Color {
  #strValue;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.#strValue = value;
  }

  /**
   * @param {string} value
   * @returns {Color|undefined}
   */
  static createObj(value) {
    if (colorsNames[value]) {
      return new ExtendedColor(value);
    }
  }

  /**
   * @returns {Color}
   */
  getMinifiedValue() {
    let value = this.#strValue.toLowerCase();
    const hexString = colorsNames[value];
    if (hexString.length < value.length) {
      return new HexColor(hexString.substring(1));
    }
    return new ExtendedColor(value);
  }

  toString() {
    return this.#strValue;
  }
}

class HexColor extends Color {
  #strValue;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.#strValue = '#' + value;
  }

  /**
   * @param {string} value
   * @returns {Color|undefined}
   */
  static createObj(value) {
    if (/^#[a-f0-9]{6,6}$/.test(value) || /^#[a-f0-9]{3,3}$/.test(value)) {
      return new HexColor(value.substring(1));
    }
  }

  /**
   * @returns {Color}
   */
  getMinifiedValue() {
    let value = this.#strValue;

    if (value.length === 7) {
      // See if it can be shortened to 3 characters.
      if (
        value[1] === value[2] &&
        value[3] === value[4] &&
        value[5] === value[6]
      ) {
        return new HexColor(value[1] + value[3] + value[5]);
      }
    }
    const name = colorsShortNames[value];
    if (name && name.length <= value.length) {
      return new ExtendedColor(name);
    }
    return this;
  }

  toString() {
    return this.#strValue;
  }
}

class RGBColor extends Color {
  #rgb;

  /**
   * @param {number[]} rgb
   */
  constructor(rgb) {
    super();
    this.#rgb = rgb;
  }

  /**
   * @param {string} value
   * @returns {Color|undefined}
   */
  static createObj(value) {
    const match = REGEX_RGB.exec(value);
    if (!match) {
      return;
    }
    const strArgs = match[1];
    if (!strArgs) {
      return;
    }
    if (strArgs.includes('%')) {
      return RGBPctColor.createObj(strArgs);
    }
    const rawArgs = strArgs.split(REGEX_RGB_ARGS);
    const args = rawArgs.filter((a) => a !== '');
    if (args.length !== 3) {
      return;
    }
    const nums = args.map((str) => {
      const n = parseInt(str);
      if (n < 0 || n > 255) {
        return;
      }
      if (str === n.toString()) {
        return n;
      }
    });
    if (nums.some((n) => n === undefined)) {
      return;
    }
    // @ts-ignore
    return new RGBColor(nums);
  }

  /**
   * @returns {Color}
   */
  getMinifiedValue() {
    return new HexColor(
      this.#rgb.reduce((str, val) => {
        const hex = val.toString(16);
        return str + (hex.length === 1 ? '0' + hex : hex);
      }, ''),
    ).getMinifiedValue();
  }

  toString() {
    return `rgb(${this.#rgb.join(',')})`;
  }
}

class RGBPctColor extends Color {
  #rgb;

  /**
   * @param {[number,number,number]} rgb
   */
  constructor(rgb) {
    super();
    this.#rgb = rgb;
  }

  /**
   * @param {string} value
   * @returns {Color|undefined}
   */
  static createObj(value) {
    const rawArgs = value.split(REGEX_RGB_ARGS);
    const args = rawArgs.filter((a) => a !== '');
    if (args.length !== 3) {
      return;
    }
    const nums = args.map((str) => {
      if (str.length === 1 || !str.endsWith('%')) {
        return;
      }
      const numStr = str.substring(0, str.length - 1);
      const n = parseFloat(numStr);
      if (n < 0 || n > 100 || numStr !== n.toString()) {
        return;
      }
      return n;
    });
    if (nums.some((n) => n === undefined)) {
      return;
    }
    // @ts-ignore - undefined values excluded above
    return new RGBPctColor(nums);
  }

  /**
   * @returns {Color}
   */
  getMinifiedValue() {
    /** @type {number[]} */
    const rgb = [];
    // If all percentages are 0 or 100, convert to regular rgb.
    for (const pct of this.#rgb) {
      if (pct === 0) {
        rgb.push(0);
      } else if (pct === 100) {
        rgb.push(255);
      } else {
        break;
      }
    }
    if (rgb.length === 3) {
      return new HexColor(
        rgb.map((c) => (c === 0 ? '0' : 'f')).join(''),
      ).getMinifiedValue();
    }
    return this;
  }

  round() {
    /** @type {[number,number,number]} */
    // @ts-ignore
    const rgb = this.#rgb.map((pct) => Math.round((pct * 255) / 100));
    return new RGBColor(rgb).getMinifiedValue();
  }

  toString() {
    return `rgb(${this.#rgb.map((n) => n + '%').join(',')})`;
  }
}

class StringColor extends Color {
  #strValue;

  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.#strValue = value;
  }

  toString() {
    return this.#strValue;
  }
}
