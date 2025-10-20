import { parseProperty } from './css-props.js';

export const MARKER_PROP_NAMES = ['marker-start', 'marker-mid', 'marker-end'];

/**
 * @param {import('../lib/types.js').CSSDeclarationMap} declarations
 * @returns {boolean}
 */
export function hasMarkerProperties(declarations) {
  return (
    MARKER_PROP_NAMES.every((name) => declarations.get(name)) &&
    ['marker-mid', 'marker-end'].every((name) => {
      const start = declarations.get('marker-start');
      const other = declarations.get(name);
      return (
        start !== undefined &&
        other !== undefined &&
        start.value.toString() === other.value.toString() &&
        start.important === other.important
      );
    })
  );
}

/**
 * @param {string|undefined} css
 * @returns {Map<string,import('./types.js').CSSPropertyValue>}
 */
export function parseStyleDeclarations(css) {
  if (css === undefined) {
    return new Map();
  }

  /** @type {Map<string,import('./types.js').CSSPropertyValue>} */
  const declarations = new Map();

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
