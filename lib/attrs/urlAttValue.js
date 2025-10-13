import { RawUrlAttValue } from './rawUrlAttValue.js';

const RE_ATT_URL = /\s*url\(\s*(["'])?([^)\s"']+)\1\s*\)/;

export class UrlAttValue extends RawUrlAttValue {
  /**
   * @param {string} value
   */
  constructor(value) {
    const match = RE_ATT_URL.exec(value);
    if (match === null) {
      throw new Error(`unable to parse url "${value}"`);
    }
    const literalString = match[2];
    super(decodeURIComponent(literalString));
  }

  toString() {
    return `url(${super.toString()})`;
  }
}
