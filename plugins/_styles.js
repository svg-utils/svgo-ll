import { LengthOrPctValue } from '../lib/lengthOrPct.js';
import { StyleAttValue } from '../lib/styleAttValue.js';
import { svgAttTransformToCSS } from '../lib/svg-to-css.js';
import { inheritableAttrs, presentationProperties } from './_collections.js';

export const TRANSFORM_PROP_NAMES = ['transform', 'transform-origin'];

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {Map<string,import('../lib/types.js').CSSPropertyValue>}
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
 * @param {function(string):boolean} fnInclude
 * @returns {Map<string,import('../lib/types.js').CSSPropertyValue>}
 */
function _getProperties(element, fnInclude) {
  /** @type {Map<string,import('../lib/types.js').CSSPropertyValue>} */
  const props = new Map();

  // Gather all inheritable attributes.
  for (const [name, value] of Object.entries(element.attributes)) {
    if (!fnInclude(name)) {
      continue;
    }

    switch (name) {
      case 'font-size':
        {
          const cssValue = LengthOrPctValue.getLengthOrPctObj(value);
          props.set(name, { value: cssValue, important: false });
        }
        break;
      case 'transform':
        {
          const cssValue = svgAttTransformToCSS(value);
          if (cssValue) {
            props.set(name, cssValue);
          }
        }
        break;
      default:
        props.set(name, { value: value, important: false });
        break;
    }
  }

  // Overwrite with inheritable properties.
  const styleAttValue = StyleAttValue.getStyleAttValue(element);
  if (styleAttValue) {
    for (const [name, prop] of styleAttValue.entries()) {
      if (fnInclude(name)) {
        props.set(name, prop);
      }
    }
  }

  return props;
}
