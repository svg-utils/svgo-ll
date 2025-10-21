import { SvgAttMap } from './ast/svgAttMap.js';
import { parseProperty } from './css-props.js';

export const MARKER_PROP_NAMES = ['marker-start', 'marker-mid', 'marker-end'];

/**
 * @param {SvgAttMap} declarations
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
        start.toString() === other.toString() &&
        start.isImportant() === other.isImportant()
      );
    })
  );
}

/**
 * @param {string|undefined} css
 * @returns {SvgAttMap}
 */
export function parseStyleDeclarations(css) {
  const declarations = new SvgAttMap();

  if (css === undefined) {
    return declarations;
  }

  const decList = css.split(';');
  for (const declaration of decList) {
    if (declaration) {
      const pv = declaration.split(':');
      if (pv.length === 2) {
        const dec = pv[1].trim();
        const name = pv[0].trim();
        const isImportant = dec.endsWith('!important');
        const propStr = isImportant
          ? dec.substring(0, dec.length - 10).trim()
          : dec;
        setStyleProperty(declarations, name, propStr, isImportant);
      }
    }
  }
  return declarations;
}

/**
 * @param {SvgAttMap} declarations
 * @param {string} name
 * @param {string} propStr
 * @param {boolean} isImportant
 */
export function setStyleProperty(declarations, name, propStr, isImportant) {
  const value = parseProperty(name, propStr, isImportant);
  if (name === 'marker') {
    // Expand the shorthand property.
    MARKER_PROP_NAMES.forEach((name) => declarations.set(name, value));
  } else {
    declarations.set(name, value);
  }
}
