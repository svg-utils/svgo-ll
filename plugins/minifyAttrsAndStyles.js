import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { updateStyleAttribute } from '../lib/svgo/tools-svg.js';
import { transformAttrs } from './_collections.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'minifyAttrsAndStyles';
export const description =
  'use the shorter of attributes and styles in each element';

/** @type {import('./plugins-types.js').Plugin<'minifyAttrsAndStyles'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        const props = getPresentationProperties(element);
        if (props.size === 0) {
          return;
        }

        let hasTransformAttribute = false;
        if (hasTransform(props.keys())) {
          const styleAttValue = StyleAttValue.getStyleAttValue(element);
          if (styleAttValue && hasTransform(styleAttValue.keys())) {
            return;
          }
          hasTransformAttribute = true;

          // Remove any transform properties from the map so they don't affect calculations.
          for (const attName of transformAttrs) {
            props.delete(attName);
          }
        }

        if (getAttrWidth(props) < getStyleWidth()) {
          // Attributes are shorter; remove the style attribute and use individual attributes.

          for (const [name, value] of props.entries()) {
            element.attributes[name] = value.value;
          }

          updateStyleAttribute(element, undefined);
        } else if (!hasTransformAttribute) {
          // Style is at least as short; remove the individual attributes and convert to style properties.
          for (const name of props.keys()) {
            delete element.attributes[name];
          }

          updateStyleAttribute(element, new StyleAttValue(props));
        }
      },
    },
  };
};

/**
 * @param {Map<string,import('../lib/types.js').CSSPropertyValue>} props
 * @returns {number}
 */
function getAttrWidth(props) {
  return (props.size - 1) * 2; // Account for extra quotes around attributes.
}

/**
 * @returns {number}
 */
function getStyleWidth() {
  return 6; // Account for "style="".
}

/**
 * @param {IterableIterator<string>} propNames
 * @returns {boolean}
 */
function hasTransform(propNames) {
  for (const propName of propNames) {
    if (transformAttrs.has(propName)) {
      return true;
    }
  }
  return false;
}
