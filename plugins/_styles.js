import { getStyleDeclarations } from '../lib/css-tools.js';
import { svgAttTransformToCSS, svgToString } from '../lib/svg-parse-att.js';
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
  for (const [k, v] of Object.entries(element.attributes)) {
    const value = getSVGAttributeValue(v);
    if (inheritableAttrs.has(k)) {
      props.set(k, { value: svgToString(value), important: false });
    } else if (k === 'transform') {
      const cssValue = svgAttTransformToCSS(value);
      if (cssValue) {
        props.set(k, cssValue);
      }
    } else if (TRANSFORM_PROP_NAMES.includes(k)) {
      props.set(k, { value: svgToString(value), important: false });
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

/**
 * @param {string|import('../lib/types.js').SVGAttValue} v
 * @returns {import('../lib/types.js').SVGAttValue}
 */
function getSVGAttributeValue(v) {
  if (typeof v === 'string') {
    return { strVal: v };
  }
  return v;
}
