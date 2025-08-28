import { colorsNames, colorsShortNames } from '../plugins/_collections.js';
import { AttValue } from './attvalue.js';

const REGEX_RGB = /rgb\((.*)\)/i;
const REGEX_RGB_ARGS = /\s|,/;

export class ColorValue extends AttValue {
  /**
   * @param {string|undefined} strVal
   */
  constructor(strVal) {
    super(strVal);
  }

  /**
   * @param {string} value
   * @returns {ColorValue}
   */
  static #createColorObj(value) {
    value = value.trim();
    const lower = value.toLowerCase();
    if (value.startsWith('#')) {
      const obj = HexColor.create(value.substring(1));
      if (obj) {
        return obj;
      }
    } else if (colorsNames[lower]) {
      return new ExtendedColor(value);
    } else if (lower.startsWith('rgb(')) {
      const obj = value.includes('%')
        ? RGBPctColor.create(value)
        : RGBColor.create(value);
      if (obj) {
        return obj;
      }
    }
    return new ColorValue(value);
  }

  /**
   * @param {import('./types.js').SVGAttValue} value
   * @returns {ColorValue}
   */
  static getColorObj(value) {
    if (typeof value === 'string') {
      return this.#createColorObj(value);
    }
    if (value instanceof ColorValue) {
      return value;
    }
    throw new Error(value.toString());
  }

  /**
   * @returns {ColorValue}
   */
  getMinifiedValue() {
    return this;
  }

  /**
   * @returns {ColorValue}
   */
  round() {
    return this;
  }
}

class ExtendedColor extends ColorValue {
  /**
   * @returns {ColorValue}
   */
  getMinifiedValue() {
    let value = this.toString().toLowerCase();
    const hexString = colorsNames[value];
    if (hexString.length < value.length) {
      return new HexColor(hexString);
    }
    return new ExtendedColor(value);
  }
}

class HexColor extends ColorValue {
  /**
   * @param {string} hexDigits
   * @returns {HexColor|undefined}
   */
  static create(hexDigits) {
    if (hexDigits.length !== 3 && hexDigits.length !== 6) {
      return;
    }
    for (const char of hexDigits.toLowerCase()) {
      switch (char) {
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          break;
        default:
          return;
      }
    }

    return new HexColor('#' + hexDigits);
  }

  /**
   * @returns {ColorValue}
   */
  getMinifiedValue() {
    let value = this.toString().toLowerCase();

    if (value.length === 7) {
      // See if it can be shortened to 3 characters.
      if (
        value[1] === value[2] &&
        value[3] === value[4] &&
        value[5] === value[6]
      ) {
        return new HexColor(
          '#' + value[1] + value[3] + value[5],
        ).getMinifiedValue();
      }
    }
    const name = colorsShortNames[value];
    if (name && name.length <= value.length) {
      return new ExtendedColor(name);
    }
    return new HexColor(value);
  }
}

class RGBColor extends ColorValue {
  #rgb;

  /**
   * @param {string|undefined} fn
   * @param {[number,number,number]} rgb
   */
  constructor(fn, rgb) {
    super(fn);
    this.#rgb = rgb;
  }

  /**
   * @param {string} fn
   * @returns {RGBColor|undefined}
   */
  static create(fn) {
    const match = REGEX_RGB.exec(fn);
    if (!match) {
      return;
    }
    const strArgs = match[1];
    if (!strArgs) {
      return;
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
    // @ts-ignore - undefined values excluded above
    return new RGBColor(fn, nums);
  }

  /**
   * @returns {ColorValue}
   */
  getMinifiedValue() {
    return new HexColor(
      this.#rgb.reduce((str, val) => {
        const hex = val.toString(16);
        return str + (hex.length === 1 ? '0' + hex : hex);
      }, '#'),
    ).getMinifiedValue();
  }
}

class RGBPctColor extends ColorValue {
  #rgb;

  /**
   * @param {string} fn
   * @param {[number,number,number]} rgb
   */
  constructor(fn, rgb) {
    super(fn);
    this.#rgb = rgb;
  }

  /**
   * @param {string} fn
   * @returns {RGBColor|undefined}
   */
  static create(fn) {
    const match = REGEX_RGB.exec(fn);
    if (!match) {
      return;
    }
    const strArgs = match[1];
    if (!strArgs) {
      return;
    }
    const rawArgs = strArgs.split(REGEX_RGB_ARGS);
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
    return new RGBPctColor(fn, nums);
  }

  /**
   * @returns {ColorValue}
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
      // @ts-ignore
      return new RGBColor(undefined, rgb).getMinifiedValue();
    }
    return this;
  }

  round() {
    /** @type {[number,number,number]} */
    // @ts-ignore
    const rgb = this.#rgb.map((pct) => Math.round((pct * 255) / 100));
    return new RGBColor(undefined, rgb).getMinifiedValue();
  }

  toString() {
    return `rgb(${this.#rgb.map((n) => n + '%').join(',')})`;
  }
}
