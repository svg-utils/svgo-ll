import { AttValue } from './attrs/attValue.js';
import { ExactNum } from './exactnum.js';

/**
 * @param {string} str
 * @return {import('./types-css-decl.js').CSSTransformFn[]|null}
 * @see https://drafts.csswg.org/css-transforms/#typedef-transform-function
 */
export function cssParseTransform(str) {
  /** @type {import('./types-css-decl.js').CSSTransformFn[]} */
  const transforms = [];
  const fns = str.split(')');
  for (let index = 0; index < fns.length - 1; index++) {
    const fn = fns[index];
    const parts = fn.split('(');
    if (parts.length !== 2) {
      return null;
    }
    const name = parts[0].trim();
    const strArgs = parts[1].trim();
    const args = strArgs.split(',').map((a) => a.trim());
    switch (name) {
      case 'matrix':
        if (args.length !== 6) {
          return null;
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
            return null;
          }
          const angle = parseAngle(args[0]);
          if (angle === null) {
            return null;
          }
          transforms.push({ name: name, a: angle });
        }
        break;
      case 'scale':
        {
          switch (args.length) {
            case 1:
              break;
            case 2:
              if (args[1].endsWith('%')) {
                return null;
              }
              break;
            default:
              return null;
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
              /** @type {import('./types-css-decl.js').CSSTypeLength|null} */
              const y =
                args.length == 2
                  ? parseLength(args[1])
                  : { n: ExactNum.zero(), unit: 'px' };
              if (x === null || y === null) {
                return null;
              }
              transforms.push({ name: 'translate', x: x, y: y });
            }
            break;
          default:
            return null;
        }
        break;
      default:
        return null;
    }
  }
  return transforms;
}

/**
 * @param {import('./types-css-decl.js').CSSTransformFn[]} transforms
 * @returns {string}
 */
export function cssStringifyTransform(transforms) {
  /**
   * @param {import('./types-css-decl.js').CSSTransformFn} transform
   */
  function stringify(transform) {
    switch (transform.name) {
      case 'matrix':
        return `matrix(${transform.a.getMinifiedString()},${transform.b.getMinifiedString()},${transform.c.getMinifiedString()},${transform.d.getMinifiedString()},${transform.e.getMinifiedString()},${transform.f.getMinifiedString()})`;
      case 'rotate':
      case 'skewX':
      case 'skewY':
        return `${transform.name}(${transform.a.n.getMinifiedString()}${transform.a.unit})`;
      case 'scale': {
        const sx = transform.sx.getMinifiedString();
        const sy = transform.sy.getMinifiedString();
        if (sx === sy) {
          return `scale(${sx})`;
        }
        return `scale(${sx},${sy})`;
      }
      case 'translate':
        if (transform.y.n.isZero()) {
          return `translate(${transform.x.n.getMinifiedString()}${transform.x.unit})`;
        }
        return `translate(${transform.x.n.getMinifiedString()}${transform.x.unit},${transform.y.n.getMinifiedString()}${transform.y.unit})`;
      default:
        throw new Error();
    }
  }
  return transforms.reduce(
    (str, transform) => (str += stringify(transform)),
    '',
  );
}

export class CSSTransformValue extends AttValue {
  /** @type {import('./types-css-decl.js').CSSTransformFn[]|undefined|null} */
  #transforms;

  /**
   * @param {string|undefined} strVal
   * @param {import('./types-css-decl.js').CSSTransformFn[]} [transforms]
   */
  constructor(strVal, transforms) {
    super(strVal);
    this.#transforms = transforms;
  }

  generateString() {
    if (!this.#transforms) {
      throw new Error();
    }
    return cssStringifyTransform(this.#transforms);
  }

  /**
   * @param {import('./types.js').SVGAttValue} value
   * @returns {CSSTransformValue}
   */
  static getTransformObj(value) {
    if (typeof value === 'string') {
      return new CSSTransformValue(value);
    }
    if (value instanceof CSSTransformValue) {
      return value;
    }
    throw value;
  }

  /**
   * @returns {import('./types-css-decl.js').CSSTransformFn[]|null}
   */
  getTransforms() {
    if (this.#transforms === undefined) {
      this.#transforms = cssParseTransform(this.toString());
    }
    return this.#transforms;
  }
}

/**
 * @param {string} str
 * @returns {import('./types-css-decl.js').CSSTypeAngle|null}
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
 * @returns {import('./types-css-decl.js').CSSTypeLength|null}
 */
function parseLength(str) {
  if (str === '0') {
    return { n: ExactNum.zero(), unit: 'px' };
  }
  if (!str.endsWith('px')) {
    return null;
  }
  const strN = str.substring(0, str.length - 2);
  return { n: new ExactNum(strN), unit: 'px' };
}
