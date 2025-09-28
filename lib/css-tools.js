import { parseProperty } from './css-props.js';
import { _parseStyleDeclarations } from './style-css-tree-tools.js';

const REGEX_FN = /url\([^#]/;

/**
 * @param {string} css
 */
export function _isStyleComplex(css) {
  return REGEX_FN.test(css);
}

/**
 * @param {string|undefined} css
 * @returns {Map<string,import('./types.js').CSSPropertyValue>}
 */
export function parseStyleDeclarations(css) {
  /** @type {Map<string,import('./types.js').CSSPropertyValue>} */
  const declarations = new Map();
  if (css === undefined) {
    return declarations;
  }

  if (_isStyleComplex(css)) {
    // There's a function in the declaration; use the less efficient low-level implementation.
    return _parseStyleDeclarations(css);
  }

  const decList = css.split(';');
  for (const declaration of decList) {
    if (declaration) {
      const pv = declaration.split(':');
      if (pv.length === 2) {
        const dec = pv[1].trim();
        const name = pv[0].trim();
        const value = dec.endsWith('!important')
          ? {
              value: parseProperty(
                name,
                dec.substring(0, dec.length - 10).trim(),
              ),
              important: true,
            }
          : { value: parseProperty(name, dec), important: false };
        declarations.set(name, value);
      }
    }
  }
  return declarations;
}
