import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { inheritableAttrs, presentationProperties } from './_collections.js';

export const TRANSFORM_PROP_NAMES = ['transform', 'transform-origin'];

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').SvgAttValues}
 */
export function getInheritableProperties(element) {
  return _getProperties(
    element,
    (name) => inheritableAttrs.has(name) || TRANSFORM_PROP_NAMES.includes(name),
  );
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').SvgAttValues}
 */
export function getPresentationProperties(element) {
  return _getProperties(element, (name) => presentationProperties.has(name));
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} propName
 * @returns {import('../lib/types.js').SvgAttValues}
 */
export function getProperty(element, propName) {
  return _getProperties(element, (name) => name === propName);
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {function(string):boolean} fnInclude
 * @returns {import('../lib/types.js').SvgAttValues}
 */
function _getProperties(element, fnInclude) {
  const props = new SvgAttMap();

  // Gather all attributes.
  for (const [name, value] of element.svgAtts.entries()) {
    if (!fnInclude(name)) {
      continue;
    }

    props.set(name, value);
  }

  // Overwrite with properties.
  const styleAttValue = StyleAttValue.getAttValue(element);
  if (styleAttValue) {
    for (const [name, prop] of styleAttValue.entries()) {
      if (fnInclude(name)) {
        props.set(name, prop);
      }
    }
  }

  return props;
}
