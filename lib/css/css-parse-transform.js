import { ExactNum } from '../exactnum.js';
import { SVGOError } from '../svgo/tools.js';
import { isDigit } from '../svgo/utils.js';

class CSSLengthParseError extends SVGOError {
  /**
   * @param {string} str
   */
  constructor(str) {
    super(`unable to parse CSS length "${str}"`);
  }
}

class CSSTransformParseError extends SVGOError {
  /**
   * @param {string} str
   */
  constructor(str) {
    super(`unable to parse CSS transform "${str}"`);
  }
}

/**
 * @param {string} str
 * @return {import('../types-transform.js').TransformFn[]}
 * @see https://drafts.csswg.org/css-transforms/#typedef-transform-function
 */
export function cssParseTransform(str) {
  /** @type {import('../types-transform.js').TransformFn[]} */
  const transforms = [];
  const fns = str.split(')');
  for (let index = 0; index < fns.length - 1; index++) {
    const fn = fns[index];
    const parts = fn.split('(');
    if (parts.length !== 2) {
      throw new CSSTransformParseError(str);
    }
    const name = parts[0].trim();
    const strArgs = parts[1].trim();
    const args = strArgs.split(',').map((a) => a.trim());
    switch (name) {
      case 'matrix':
        if (args.length !== 6) {
          throw new CSSTransformParseError(str);
        }
        transforms.push({
          name: 'matrix',
          a: new ExactNum(args[0]),
          b: new ExactNum(args[1]),
          c: new ExactNum(args[2]),
          d: new ExactNum(args[3]),
          e: new ExactNum(args[4]),
          f: new ExactNum(args[5]),
        });
        break;
      case 'rotate':
      case 'skewX':
      case 'skewY':
        {
          if (args.length !== 1) {
            throw new CSSTransformParseError(str);
          }
          const angle = parseAngle(args[0]);
          if (angle === null) {
            throw new CSSTransformParseError(str);
          }
          if (name === 'rotate') {
            transforms.push({
              name: name,
              a: angle,
            });
          } else {
            transforms.push({ name: name, a: angle });
          }
        }
        break;
      case 'scale':
        {
          switch (args.length) {
            case 1:
              break;
            case 2:
              if (args[1].endsWith('%')) {
                throw new CSSTransformParseError(str);
              }
              break;
            default:
              throw new CSSTransformParseError(str);
          }
          const sy = args.length === 2 ? args[1] : args[0];
          transforms.push({
            name: 'scale',
            sx: new ExactNum(args[0]),
            sy: new ExactNum(sy),
          });
        }
        break;
      case 'translate':
        switch (args.length) {
          case 1:
          case 2:
            {
              const x = parseLength(args[0]);
              /** @type {import('../types-transform.js').TransTypeLength|null} */
              const y =
                args.length == 2
                  ? parseLength(args[1])
                  : { n: ExactNum.zero(), unit: 'px' };
              transforms.push({ name: 'translate', x: x, y: y });
            }
            break;
          default:
            throw new CSSTransformParseError(str);
        }
        break;
      case 'translateX':
        transforms.push({
          name: 'translate',
          x: parseLength(args[0]),
          y: { n: ExactNum.zero(), unit: 'px' },
        });
        break;
      case 'translateY':
        transforms.push({
          name: 'translate',
          x: { n: ExactNum.zero(), unit: 'px' },
          y: parseLength(args[0]),
        });
        break;
      default:
        throw new CSSTransformParseError(str);
    }
  }
  return transforms;
}

/**
 * @param {string} str
 * @returns {import('../types-transform.js').TransTypeAngle|null}
 */
function parseAngle(str) {
  if (str === '0') {
    return { n: ExactNum.zero(), unit: 'deg' };
  }
  const unitLen = str.endsWith('deg') || str.endsWith('rad') ? 3 : 4;
  const strN = str.substring(0, str.length - unitLen);
  const unit = str.substring(str.length - unitLen);
  if (unit != 'deg' && unit != 'grad' && unit != 'rad' && unit != 'turn') {
    return null;
  }
  return { n: new ExactNum(strN), unit: unit };
}

/**
 * @param {string} str
 * @returns {import('../types-transform.js').TransTypeLength}
 */
function parseLength(str) {
  if (str === '0') {
    return { n: ExactNum.zero(), unit: 'px' };
  }

  let unit = '';
  for (let index = str.length - 1; index >= 0; index--) {
    const c = str[index];
    if (isDigit(c)) {
      break;
    }
    unit = c + unit;
  }

  switch (unit) {
    case 'px':
    case 'cm':
    case 'em':
    case 'mm':
    case 'Q':
    case 'in':
    case 'pc':
    case 'pt':
      break;
    default:
      throw new CSSLengthParseError(str);
  }

  const strN = str.substring(0, str.length - unit.length);
  return { n: new ExactNum(strN), unit: unit };
}
