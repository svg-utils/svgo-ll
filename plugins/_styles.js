import { StyleAttValue } from '../lib/styleAttValue.js';
import { svgAttTransformToCSS } from '../lib/svg-to-css.js';
import { inheritableAttrs, presentationProperties } from './_collections.js';

export const TRANSFORM_PROP_NAMES = ['transform', 'transform-origin'];

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').CSSDeclarationMap}
 */
export function getInheritableProperties(element) {
  return _getProperties(
    element,
    (name) => inheritableAttrs.has(name) || TRANSFORM_PROP_NAMES.includes(name),
  );
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').CSSDeclarationMap}
 */
export function getPresentationProperties(element) {
  return _getProperties(element, (name) => presentationProperties.has(name));
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {function(string):boolean} fnInclude
 * @returns {import('../lib/types.js').CSSDeclarationMap}
 */
function _getProperties(element, fnInclude) {
  /** @type {import('../lib/types.js').CSSDeclarationMap} */
  const props = new Map();

  // Gather all inheritable attributes.
  for (const [name, value] of Object.entries(element.attributes)) {
    if (!fnInclude(name)) {
      continue;
    }
    if (name === 'transform') {
      const cssValue = svgAttTransformToCSS(value);
      if (cssValue) {
        props.set(name, cssValue);
      }
    } else if (TRANSFORM_PROP_NAMES.includes(name)) {
      props.set(name, { value: value, important: false });
    } else {
      props.set(name, { value: value, important: false });
    }
  }

  // Overwrite with inheritable properties.
  const styleAttValue = StyleAttValue.getStyleAttValue(element);
  if (styleAttValue) {
    for (const [name, prop] of styleAttValue.properties()) {
      if (fnInclude(name)) {
        props.set(name, prop);
      }
    }
  }

  return props;
}
