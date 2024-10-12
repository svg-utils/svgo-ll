import { colorsNames, colorsShortNames } from '../plugins/_collections.js';
import { AttValue } from './attvalue.js';

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
    if (value.startsWith('#')) {
      const obj = HexColor.create(value.substring(1));
      if (obj) {
        return obj;
      }
    } else if (colorsNames[value.toLowerCase()]) {
      return new ExtendedColor(value);
    }
    return new ColorValue(value);
  }

  /**
   * @param {string|AttValue} value
   * @returns {ColorValue}
   */
  static getColorObj(value) {
    if (typeof value === 'string') {
      return this.#createColorObj(value);
    }
    if (value instanceof ColorValue) {
      return value;
    }
    throw value;
  }

  /**
   * @returns {ColorValue}
   */
  getMinifiedValue() {
    return this;
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
