import { OpacityValue } from '../lib/attvalue.js';
import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';
import { LengthValue } from '../lib/length.js';
import { parsePathCommands, stringifyPathCommands } from '../lib/pathutils.js';
import {
  svgParseTransform,
  svgSetAttValue,
  SVGTransformValue,
} from '../lib/svg-parse-att.js';
import { toFixed } from '../lib/svgo/tools.js';

export const name = 'round';
export const description = 'Round numbers to fewer decimal digits';

/**
 * @typedef {{width:number|null,height:number|null,xDigits:number|null,yDigits:number|null}} CoordRoundingContext
 */

/** @type {Readonly<CoordRoundingContext>} */
const NULL_COORD_CONTEXT = {
  width: null,
  height: null,
  xDigits: null,
  yDigits: null,
};

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
      enter: (element, parentNode, parentInfo) => {
        const properties = styleData.computeStyle(element, parentInfo);
        const transform = properties.get('transform');
        if (transform === undefined || isTranslation(transform)) {
          // Generate the coordinate rounding context.
          switch (element.name) {
            case 'marker':
            case 'pattern':
            case 'svg':
            case 'symbol':
            case 'view':
              coordContextStack.push(getCoordContext(element, coordDigits));
              break;
            default:
              // Copy the context from parent element.
              coordContextStack.push(
                coordContextStack[coordContextStack.length - 1],
              );
          }
        } else {
          coordContextStack.push(NULL_COORD_CONTEXT);
        }

        const coordContext = coordContextStack[coordContextStack.length - 1];

        // Round attributes.
        for (const [attName, attValue] of Object.entries(element.attributes)) {
          let newVal;
          switch (attName) {
            case 'd':
              newVal = roundPath(
                attValue,
                coordContext.xDigits,
                coordContext.yDigits,
              );
              break;
            case 'fill-opacity':
            case 'opacity':
              newVal = roundOpacity(attValue, opacityDigits);
              break;
            case 'transform':
              newVal = roundTransform(
                attValue,
                coordContext.xDigits,
                coordContext.yDigits,
              );
              break;
            case 'x':
            case 'width':
              newVal = roundCoord(attValue, coordContext.xDigits);
              break;
            case 'y':
            case 'height':
              newVal = roundCoord(attValue, coordContext.yDigits);
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
    return Math.max(baseDigits - Math.floor(Math.log10(size)) + 2);
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
        xDigits: scaleDigits(width, digits),
        yDigits: scaleDigits(height, digits),
      };
    }
  } else if (element.attributes.width && element.attributes.height) {
    const width = LengthValue.getLengthObj(element.attributes.width);
    const height = LengthValue.getLengthObj(element.attributes.height);
    const x = width.getPixels();
    const y = height.getPixels();
    if (x !== null && y !== null) {
      return {
        width: x,
        height: y,
        xDigits: scaleDigits(x, digits),
        yDigits: scaleDigits(y, digits),
      };
    }
  }
  return NULL_COORD_CONTEXT;
}

/**
 * @param {string|null} transform
 * @returns {boolean}
 */
function isTranslation(transform) {
  if (transform === null) {
    return false;
  }
  const transforms = svgParseTransform(transform);
  return transforms.length === 1 && transforms[0].name === 'translate';
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

/**
 * @param {string} attValue
 * @param {number|null} xDigits
 * @param {number|null} yDigits
 * @returns {string|null}
 */
function roundPath(attValue, xDigits, yDigits) {
  if (xDigits === null || yDigits === null) {
    return null;
  }
  const commands = parsePathCommands(attValue);
  for (const command of commands) {
    switch (command.command) {
      case 'l':
      case 'm':
        command.dx.setNumberOfDigits(xDigits);
        command.dy.setNumberOfDigits(yDigits);
        break;
      case 'L':
      case 'M':
        command.x.setNumberOfDigits(xDigits);
        command.y.setNumberOfDigits(yDigits);
        break;
      case 'h':
        command.dx.setNumberOfDigits(xDigits);
        break;
      case 'H':
        command.x.setNumberOfDigits(xDigits);
        break;
      case 'v':
        command.dy.setNumberOfDigits(yDigits);
        break;
      case 'V':
        command.y.setNumberOfDigits(yDigits);
        break;
    }
  }
  return stringifyPathCommands(commands);
}

/**
 * @param {import('../lib/types.js').SVGAttValue} attValue
 * @param {number|null} xDigits
 * @param {number|null} yDigits
 * @returns {SVGTransformValue|null}
 */
function roundTransform(attValue, xDigits, yDigits) {
  if (xDigits === null || yDigits === null) {
    return null;
  }
  const transforms = SVGTransformValue.getTransformObj(attValue);
  for (const transform of transforms.getTransforms()) {
    if (transform.name !== 'translate') {
      return null;
    }
    transform.x.setNumberOfDigits(xDigits);
    transform.y.setNumberOfDigits(yDigits);
  }
  return new SVGTransformValue(undefined, transforms.getTransforms());
}
