import {
  svgGetAttValue,
  svgGetOpacity,
  svgSetAttValue,
} from '../lib/svg-parse-att.js';
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
        for (const [attName, value] of Object.entries(element.attributes)) {
          let newVal;
          const attValue = svgGetAttValue(value);
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
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').SVGAttValue} attValue
 * @param {number} digits
 * @returns {import('../lib/types.js').SVGAttValue|null}
 */
function roundOpacity(attValue, digits) {
  const opacity = svgGetOpacity(attValue);
  if (opacity === null) {
    return null;
  }
  if (opacity >= 1) {
    return { strVal: '1', parsedVal: { type: 'opacity', value: 1 } };
  }
  if (opacity <= 0) {
    return { strVal: '0', parsedVal: { type: 'opacity', value: 0 } };
  }
  return { strVal: toFixed(opacity, digits).toString() };
}
