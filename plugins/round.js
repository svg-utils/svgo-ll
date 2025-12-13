import { PathAttValue } from '../lib/attrs/pathAttValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { PaintAttValue } from '../lib/attrs/paintAttValue.js';
import { LengthPercentageAttValue } from '../lib/attrs/lengthPercentageAttValue.js';
import { OpacityAttValue } from '../lib/attrs/opacityAttValue.js';
import { StdDeviationAttValue } from '../lib/attrs/stdDeviationAttValue.js';
import { TransformAttValue } from '../lib/attrs/transformAttValue.js';
import { ViewBoxAttValue } from '../lib/attrs/viewBoxAttValue.js';
import { TransformList } from '../lib/types/transformList.js';

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

  const {
    coordDigits = 4,
    fontSizeDigits = 3,
    opacityDigits = 3,
    stopOffsetDigits = 3,
    stdDeviationDigits = 3,
  } = params;

  /** @type {CoordRoundingContext[]} */
  const coordContextStack = [];

  return {
    element: {
      enter: (element, parentList) => {
        if (element.uri !== undefined) {
          return;
        }

        const properties = styleData.computeStyle(element, parentList);
        const transform = properties.get('transform');
        if (transform === undefined || isTranslation(transform)) {
          // Generate the coordinate rounding context.
          switch (element.local) {
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
        for (const [attName, attValue] of element.svgAtts.entries()) {
          /** @deprecated - anything roundable should return a rounded value */
          let newVal;
          switch (attName) {
            case 'd':
              roundPath(element, coordContext.xDigits, coordContext.yDigits);
              break;
            case 'fill':
            case 'stroke':
              {
                const value = PaintAttValue.getAttValue(element, attName);
                if (value) {
                  newVal = value.round();
                }
              }
              break;
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
              element.svgAtts.set(
                attName,
                /** @type {import('../types/types.js').ColorAttValue} */ (
                  attValue
                ).round(),
              );
              break;
            case 'fill-opacity':
            case 'opacity':
            case 'stop-opacity':
              {
                const att = OpacityAttValue.getAttValue(element, attName);
                if (att) {
                  element.svgAtts.set(attName, att.round(opacityDigits));
                }
              }
              break;
            case 'font-size':
              element.svgAtts.set('font-size', attValue.round(fontSizeDigits));
              break;
            case 'offset':
              if (element.local === 'stop') {
                element.svgAtts.set('offset', attValue.round(stopOffsetDigits));
              }
              break;
            case 'stdDeviation':
              {
                const att = StdDeviationAttValue.getAttValue(element);
                if (att) {
                  element.svgAtts.set(
                    'stdDeviation',
                    att.round(stdDeviationDigits),
                  );
                }
              }
              break;
            case 'transform':
              newVal = roundTransform(
                /** @type {TransformAttValue} */ (attValue),
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
                ROUNDABLE_XY_ELEMENTS[attName].has(element.local)
              ) {
                roundCoord(element, attName, coordContext.xDigits);
              }
              break;
            case 'y':
            case 'y1':
            case 'y2':
            case 'height':
              if (
                !ROUNDABLE_XY_ELEMENTS[attName] ||
                ROUNDABLE_XY_ELEMENTS[attName].has(element.local)
              ) {
                roundCoord(element, attName, coordContext.yDigits);
              }
              break;
          }
          if (newVal) {
            element.svgAtts.set(attName, newVal);
          }
        }

        // Round style attribute properties.
        const styleAttValue = StyleAttValue.getAttValue(element);
        if (!styleAttValue) {
          return;
        }
        for (const [propName, propValue] of styleAttValue.entries()) {
          /** @deprecated */
          let newVal;
          switch (propName) {
            case 'fill':
            case 'stroke':
              styleAttValue.set(
                propName,
                /** @type {PaintAttValue} */ (propValue).round(),
              );
              break;
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
              styleAttValue.set(
                propName,
                /** @type {import('../types/types.js').ColorAttValue} */ (
                  propValue
                ).round(),
              );
              break;
            case 'fill-opacity':
            case 'opacity':
            case 'stop-opacity':
              newVal = propValue.round(opacityDigits);
              break;
            case 'font-size':
              styleAttValue.set(propName, propValue.round(fontSizeDigits));
              break;
          }
          if (newVal) {
            styleAttValue.set(propName, newVal);
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

  const viewBox = ViewBoxAttValue.getAttValue(element);
  if (viewBox) {
    const coords = viewBox.getCoordinates();
    if (coords.length === 4) {
      const width = coords[2].getValue();
      const height = coords[3].getValue();
      return {
        width: width,
        height: height,
        xDigits: scaleDigits(width, digits),
        yDigits: scaleDigits(height, digits),
      };
    }
  } else {
    const attWidth = LengthPercentageAttValue.getAttValue(element, 'width');
    const attHeight = LengthPercentageAttValue.getAttValue(element, 'height');
    if (attWidth !== undefined && attHeight !== undefined) {
      const x = attWidth.getPixels();
      const y = attHeight.getPixels();
      if (x !== null && y !== null) {
        return {
          width: x,
          height: y,
          xDigits: scaleDigits(x, digits),
          yDigits: scaleDigits(y, digits),
        };
      }
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
  // TODO: should already be parsed
  const transforms = new TransformAttValue(transform).getTransforms();
  return (
    transforms !== undefined &&
    transforms.length === 1 &&
    transforms[0].name === 'translate'
  );
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} attName
 * @param {number|null} digits
 * @returns {void}
 */
function roundCoord(element, attName, digits) {
  if (digits === null) {
    return;
  }
  const value = LengthPercentageAttValue.getAttValue(element, attName);
  if (value) {
    element.svgAtts.set(attName, value.round(digits));
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {number|null} xDigits
 * @param {number|null} yDigits
 * @returns {void}
 */
function roundPath(element, xDigits, yDigits) {
  if (xDigits === null || yDigits === null) {
    return;
  }

  const attValue = PathAttValue.getAttValue(element);
  if (attValue === undefined || attValue.isRounded()) {
    return;
  }

  const commands = attValue.getParsedPath();
  if (commands === null) {
    return;
  }
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

  element.svgAtts.set('d', new PathAttValue(undefined, commands, false, true));
}

/**
 * @param {TransformAttValue} attValue
 * @param {number|null} xDigits
 * @param {number|null} yDigits
 * @returns {TransformAttValue|null}
 */
function roundTransform(attValue, xDigits, yDigits) {
  if (xDigits === null || yDigits === null) {
    return null;
  }
  const transforms = attValue.getTransforms();
  if (transforms === undefined) {
    return null;
  }
  for (const transform of transforms) {
    if (transform.name !== 'translate') {
      return null;
    }
    transform.x.n = transform.x.n.round(xDigits);
    transform.y.n = transform.y.n.round(yDigits);
  }
  return new TransformAttValue(new TransformList(transforms));
}
