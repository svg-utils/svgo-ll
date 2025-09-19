import { ColorValue } from '../lib/color.js';
import { LengthValue } from '../lib/length.js';
import { OpacityValue } from '../lib/opacity.js';
import { parsePathCommands, stringifyPathCommands } from '../lib/pathutils.js';
import { StopOffsetValue } from '../lib/stop-offset.js';
import { svgParseTransform, SVGTransformValue } from '../lib/svg-parse-att.js';
import { toFixed } from '../lib/svgo/tools.js';
import { PathAttValue } from '../lib/pathAttValue.js';
import { StyleAttValue } from '../lib/styleAttValue.js';

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

/** @type {Object<string,Set<string>>} */
const ROUNDABLE_XY_ELEMENTS = {
  x1: new Set(['line']),
  y1: new Set(['line']),
  x2: new Set(['line']),
  y2: new Set(['line']),
};

/** @type {import('./plugins-types.js').Plugin<'round'>} */
export const fn = (info, params) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector()
  ) {
    return;
  }

  const { coordDigits = 4, opacityDigits = 3, stopOffsetDigits = 3 } = params;

  /** @type {CoordRoundingContext[]} */
  const coordContextStack = [];

  return {
    element: {
      enter: (element, parentList) => {
        const properties = styleData.computeStyle(element, parentList);
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
            case 'fill':
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
            case 'stroke':
              newVal = roundColor(attValue);
              break;
            case 'fill-opacity':
            case 'opacity':
            case 'stop-opacity':
              newVal = roundOpacity(attValue, opacityDigits);
              break;
            case 'offset':
              if (element.name === 'stop') {
                const stopOffset = StopOffsetValue.getStopOffsetObj(attValue);
                newVal = stopOffset.round(stopOffsetDigits);
              }
              break;
            case 'transform':
              newVal = roundTransform(
                attValue,
                coordContext.xDigits,
                coordContext.yDigits,
              );
              break;
            case 'x':
            case 'x1':
            case 'x2':
            case 'width':
              if (
                !ROUNDABLE_XY_ELEMENTS[attName] ||
                ROUNDABLE_XY_ELEMENTS[attName].has(element.name)
              ) {
                newVal = roundCoord(attValue, coordContext.xDigits);
              }
              break;
            case 'y':
            case 'y1':
            case 'y2':
            case 'height':
              if (
                !ROUNDABLE_XY_ELEMENTS[attName] ||
                ROUNDABLE_XY_ELEMENTS[attName].has(element.name)
              ) {
                newVal = roundCoord(attValue, coordContext.yDigits);
              }
              break;
          }
          if (newVal) {
            element.attributes[attName] = newVal;
          }
        }

        // Round style attribute properties.
        const styleAttValue = StyleAttValue.getStyleAttValue(element);
        if (!styleAttValue) {
          return;
        }
        for (const [propName, propValue] of styleAttValue.entries()) {
          let newVal;
          switch (propName) {
            case 'fill':
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
            case 'stroke':
              newVal = roundColor(propValue.value);
              break;
            case 'fill-opacity':
            case 'opacity':
              newVal = roundOpacity(propValue.value, opacityDigits);
              break;
          }
          if (newVal) {
            styleAttValue.set(propName, {
              value: newVal,
              important: propValue.important,
            });
          }
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
    return Math.max(baseDigits - Math.floor(Math.log10(size)) + 2, baseDigits);
  }

  const viewBox = element.attributes.viewBox;
  if (typeof viewBox === 'string' && viewBox) {
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
 * @param {import('../lib/types.js').SVGAttValue|null} transform
 * @returns {boolean}
 */
function isTranslation(transform) {
  if (transform === null) {
    return false;
  }
  const transforms = svgParseTransform(transform.toString());
  return transforms.length === 1 && transforms[0].name === 'translate';
}

/**
 * @param {import('../lib/types.js').SVGAttValue} attValue
 * @returns {ColorValue|null}
 */
function roundColor(attValue) {
  const value = ColorValue.getColorObj(attValue);
  return value.round();
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
 * @param {import('../lib/types.js').SVGAttValue} attValueIn
 * @param {number|null} xDigits
 * @param {number|null} yDigits
 * @returns {import('../lib/types.js').SVGAttValue|null}
 */
function roundPath(attValueIn, xDigits, yDigits) {
  if (xDigits === null || yDigits === null) {
    return null;
  }

  const inputIsString = typeof attValueIn === 'string';

  let strAttValue;
  if (inputIsString) {
    strAttValue = attValueIn;
  } else if (attValueIn instanceof PathAttValue) {
    if (attValueIn.isRounded()) {
      return null;
    }
    strAttValue = attValueIn.toString();
  } else {
    throw new Error();
  }

  const commands = parsePathCommands(strAttValue);
  for (const command of commands) {
    switch (command.command) {
      case 'l':
      case 'm':
        command.dx = command.dx.round(xDigits);
        command.dy = command.dy.round(yDigits);
        break;
      case 'L':
      case 'M':
        command.x = command.x.round(xDigits);
        command.y = command.y.round(yDigits);
        break;
      case 'h':
        command.dx = command.dx.round(xDigits);
        break;
      case 'H':
        command.x = command.x.round(xDigits);
        break;
      case 'v':
        command.dy = command.dy.round(yDigits);
        break;
      case 'V':
        command.y = command.y.round(yDigits);
        break;
    }
  }

  const rounded = stringifyPathCommands(commands);

  if (inputIsString || rounded !== strAttValue) {
    return new PathAttValue(rounded, false, true);
  }

  // Value hasn't changed by rounding, just note that we've already rounded.
  attValueIn.setRounded(true);
  return null;
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
    transform.x = transform.x.round(xDigits);
    transform.y = transform.y.round(yDigits);
  }
  return new SVGTransformValue(undefined, transforms.getTransforms());
}
