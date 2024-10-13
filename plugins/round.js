import { OpacityValue } from '../lib/attvalue.js';
import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';
import { LengthValue } from '../lib/length.js';
import { svgSetAttValue } from '../lib/svg-parse-att.js';
import { toFixed } from '../lib/svgo/tools.js';

export const name = 'round';
export const description = 'Round numbers to fewer decimal digits';

/**
 * @typedef {{width:number|null,height:number|null,widthDigits:number|null,heightDigits:number|null}} CoordRoundingContext
 */

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

  const { coordDigits = 4, opacityDigits = 3 } = params;

  /**
   * @type {CoordRoundingContext[]}
   */
  const coordContextStack = [];

  return {
    element: {
      enter: (element) => {
        // Generate the coordinate rounding context.
        switch (element.name) {
          case 'marker':
          case 'pattern':
          case 'svg':
          case 'symbol':
          case 'view':
            if (element.attributes.viewBox) {
              // Generate width and height based on the viewBox.
              coordContextStack.push(getCoordContext(element, coordDigits));
            } else {
              coordContextStack.push({
                width: null,
                height: null,
                widthDigits: null,
                heightDigits: null,
              });
            }
            break;
          default:
            // Copy the context from parent element.
            coordContextStack.push(
              coordContextStack[coordContextStack.length - 1],
            );
        }

        const coordContext = coordContextStack[coordContextStack.length - 1];

        // Round attributes.
        for (const [attName, attValue] of Object.entries(element.attributes)) {
          let newVal;
          switch (attName) {
            case 'fill-opacity':
            case 'opacity':
              newVal = roundOpacity(attValue, opacityDigits);
              break;
            case 'x':
            case 'width':
              newVal = roundCoord(attValue, coordContext.widthDigits);
              break;
            case 'y':
            case 'height':
              newVal = roundCoord(attValue, coordContext.heightDigits);
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
      exit: () => {
        coordContextStack.pop();
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {number} digits
 * @returns {CoordRoundingContext}
 */
function getCoordContext(element, digits) {
  /**
   * @param {number} size
   * @param {number} baseDigits
   * @returns {number}
   */
  function scaleDigits(size, baseDigits) {
    return Math.max(baseDigits - Math.floor(Math.log10(size)));
  }

  const viewBox = element.attributes.viewBox;
  if (viewBox) {
    const vbParsed = viewBox.trim().split(/\s+/);
    if (vbParsed.length === 4) {
      const width = parseFloat(vbParsed[2]);
      const height = parseFloat(vbParsed[3]);
      return {
        width: width,
        height: height,
        widthDigits: scaleDigits(width, digits),
        heightDigits: scaleDigits(height, digits),
      };
    }
  }
  return { width: null, height: null, widthDigits: null, heightDigits: null };
}

/**
 * @param {import('../lib/types.js').SVGAttValue} attValue
 * @param {number|null} digits
 * @returns {LengthValue|null}
 */
function roundCoord(attValue, digits) {
  if (digits === null) {
    return null;
  }
  const value = LengthValue.getLengthObj(attValue);
  return value.round(digits);
}

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
