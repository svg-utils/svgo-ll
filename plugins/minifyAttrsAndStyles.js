import { StyleAttValue } from '../lib/styleAttValue.js';
import { updateStyleAttribute } from '../lib/svgo/tools.js';
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

        if (!canConvert(props)) {
          return;
        }
        if (getAttrWidth(props) < getStyleWidth()) {
          for (const [name, value] of props.entries()) {
            element.attributes[name] = value.value;
          }

          // Remove the style attribute.
          updateStyleAttribute(element, undefined);
        } else {
          // Remove the attributes.
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
 * @returns {boolean}
 */
function canConvert(props) {
  for (const propName of props.keys()) {
    switch (propName) {
      case 'transform':
      case 'gradientTransform':
      case 'patternTransform':
        return false;
    }
  }
  return true;
}

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
