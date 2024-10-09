import { ExactNum } from './exactnum.js';

/**
 * @param {import('./types.js').CSSPropertyValue} propVal
 * @returns {import('./types-css-decl.js').CSSTransformFn[]|null}
 */
export function cssGetTransform(propVal) {
  if (propVal.parsedValue === undefined) {
    propVal.parsedValue = {
      type: 'transform',
      value: cssParseTransform(propVal.value),
    };
  }
  return propVal.parsedValue.value;
}

/**
 * @param {string} str
 * @return {import('./types-css-decl.js').CSSTransformFn[]|null}
 * @see https://drafts.csswg.org/css-transforms/#typedef-transform-function
 */
export function cssParseTransform(str) {
  /** @type {import('./types-css-decl.js').CSSTransformFn[]} */
  const transforms = [];
  const fns = str.split(')');
  for (const fn of fns) {
    if (fn.trim() === '') {
      continue;
    }
    const parts = fn.split('(');
    if (parts.length !== 2) {
      return null;
    }
    const name = parts[0].trim();
    const strArgs = parts[1].trim();
    const args = strArgs.split(',').map((a) => a.trim());
    switch (name) {
      case 'rotate':
        {
          if (args.length !== 1) {
            return null;
          }
          const angle = parseAngle(args[0]);
          if (angle === null) {
            return null;
          }
          transforms.push({ name: 'rotate', a: angle });
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
      case 'rotate':
        return `rotate(${transform.a.n.getMinifiedString()}${transform.a.unit})`;
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
