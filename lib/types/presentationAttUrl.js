import { Url } from './url.js';

/**
 * See https://svgwg.org/svg2-draft/linking.html#processingURL
 * and https://drafts.csswg.org/css-values/#url-value
 */

const RE_ATT_URL = /\s*url\(\s*(["'])?([^)\s"']+)\1\s*\)/;

export class PresentationAttUrl extends Url {
  /**
   * @param {string|undefined} fn
   * @param {string|undefined} [url]
   */
  constructor(fn, url) {
    if (url === undefined) {
      if (fn === undefined) {
        throw new Error();
      }
      const match = RE_ATT_URL.exec(fn);
      if (match === null) {
        throw new Error(`unable to parse url "${fn}"`);
      }
      url = match[2];
    }
    super(url);
  }

  toString() {
    return `url(${this.getURL().toString()})`;
  }
}
