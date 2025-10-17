import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { TransformAttValue } from '../lib/attrs/transformAttValue.js';
import { MARKER_PROP_NAMES } from '../lib/css-tools.js';
import { inheritableAttrs, presentationProperties } from './_collections.js';

export const TRANSFORM_PROP_NAMES = ['transform', 'transform-origin'];

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').CSSPropertyMap}
 */
export function getInheritableProperties(element) {
  return _getProperties(
    element,
    (name) => inheritableAttrs.has(name) || TRANSFORM_PROP_NAMES.includes(name),
  );
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {Map<string,import('../lib/types.js').CSSPropertyValue>}
 */
export function getPresentationProperties(element) {
  return _getProperties(element, (name) => presentationProperties.has(name));
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} propName
 * @returns {Map<string,import('../lib/types.js').CSSPropertyValue>}
 */
export function getProperty(element, propName) {
  return _getProperties(element, (name) => name === propName);
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {function(string):boolean} fnInclude
 * @returns {Map<string,import('../lib/types.js').CSSPropertyValue>}
 */
function _getProperties(element, fnInclude) {
  /** @type {Map<string,import('../lib/types.js').CSSPropertyValue>} */
  const props = new Map();

  // Gather all attributes.
  for (const [name, value] of element.svgAtts.entries()) {
    if (!fnInclude(name)) {
      continue;
    }

    switch (name) {
      case 'transform':
        {
          const attValue = TransformAttValue.getAttValue(element, 'transform');
          if (!attValue) {
            throw new Error();
          }
          props.set(name, { value: attValue, important: false });
        }
        break;
      default:
        props.set(name, { value: value, important: false });
        break;
    }
  }

  // Overwrite with properties.
  const styleAttValue = StyleAttValue.getAttValue(element);
  if (styleAttValue) {
    for (const [name, prop] of styleAttValue.entries()) {
      const nameToCheck = name === 'marker' ? 'marker-start' : name;
      if (fnInclude(nameToCheck)) {
        if (name === 'marker') {
          MARKER_PROP_NAMES.forEach((name) => {
            props.set(name, prop);
          });
        } else {
          props.set(name, prop);
        }
      }
    }
  }

  return props;
}
