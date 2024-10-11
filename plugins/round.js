import { OpacityValue } from '../lib/attvalue.js';
import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';
import { svgSetAttValue } from '../lib/svg-parse-att.js';
import { toFixed } from '../lib/svgo/tools.js';

export const name = 'round';
export const description = 'Round numbers to fewer decimal digits';

/**
 * @type {import('./plugins-types.js').Plugin<'round'>}
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector()
  ) {
    return;
  }

  const { opacityDigits = 2 } = params;

  return {
    element: {
      enter: (element) => {
        // Round attributes.
        for (const [attName, attValue] of Object.entries(element.attributes)) {
          let newVal;
          switch (attName) {
            case 'fill-opacity':
            case 'opacity':
              newVal = roundOpacity(attValue, opacityDigits);
              break;
          }
          if (newVal) {
            svgSetAttValue(element, attName, newVal);
          }
        }

        // Round style attribute properties.
        const props = getStyleDeclarations(element);
        if (!props) {
          return;
        }
        let propChanged = false;
        for (const [propName, propValue] of props.entries()) {
          let newVal;
          switch (propName) {
            case 'fill-opacity':
            case 'opacity':
              newVal = roundOpacity(propValue.value, opacityDigits);
              break;
          }
          if (newVal) {
            propChanged = true;
            props.set(propName, {
              value: newVal,
              important: propValue.important,
            });
          }
        }
        if (propChanged) {
          writeStyleAttribute(element, props);
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').SVGAttValue} attValue
 * @param {number} digits
 * @returns {OpacityValue|null}
 */
function roundOpacity(attValue, digits) {
  const value = OpacityValue.getOpacityObj(attValue);
  const opacity = value.getOpacity();
  if (opacity >= 1) {
    return new OpacityValue('1', 1);
  }
  if (opacity <= 0) {
    return new OpacityValue('0', 0);
  }
  return new OpacityValue(undefined, toFixed(opacity, digits));
}
