import { getStyleDeclarations } from '../lib/css-tools.js';
import { svgAttTransformToCSS } from '../lib/svg-to-css.js';
import { inheritableAttrs } from './_collections.js';

export const TRANSFORM_PROP_NAMES = ['transform', 'transform-origin'];

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').CSSDeclarationMap}
 */
export function getInheritableProperties(element) {
  /** @type {import('../lib/types.js').CSSDeclarationMap} */
  const props = new Map();

  // Gather all inheritable attributes.
  for (const [name, value] of Object.entries(element.attributes)) {
    if (inheritableAttrs.has(name)) {
      props.set(name, { value: value, important: false });
    } else if (name === 'transform') {
      const cssValue = svgAttTransformToCSS(value);
      if (cssValue) {
        props.set(name, cssValue);
      }
    } else if (TRANSFORM_PROP_NAMES.includes(name)) {
      props.set(name, { value: value, important: false });
    }
  }

  // Overwrite with inheritable properties.
  const styleProps = getStyleDeclarations(element);
  if (styleProps) {
    styleProps.forEach((v, k) => {
      if (inheritableAttrs.has(k) || TRANSFORM_PROP_NAMES.includes(k)) {
        if (v === null) {
          props.delete(k);
        } else {
          props.set(k, v);
        }
      }
    });
  }

  return props;
}
