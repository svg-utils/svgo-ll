import { ExactNum } from '../exactnum.js';
import {
  isNumber,
  parseCwsList,
  parseFuncList,
  SVGOError,
} from '../svgo/tools.js';

export class SVGTransformParseError extends SVGOError {
  /**
   * @param {string} str
   */
  constructor(str) {
    super(`unable to parse SVG transform - ${str}`);
  }
}

/**
 * @param {string} str
 * @returns {import('../types-transform.js').TransformFn[]}
 */
export function svgParseTransform(str) {
  /** @type {import('../types-transform.js').TransformFn[]} */
  const transforms = [];
  const fns = parseFuncList(str);

  for (let index = 0; index < fns.length - 1; index++) {
    const fn = fns[index];
    const parts = fn.split('(');
    if (parts.length !== 2) {
      throw new SVGTransformParseError(str);
    }
    const name = parts[0].trim();
    const args = parseCwsList(parts[1]);
    const numbers = getNumbers(args);

    switch (name) {
      case 'matrix':
        if (args.length !== 6) {
          throw new SVGTransformParseError(
            `matrix must have 6 arguments: "${args}.join(' ')"`,
          );
        }
        transforms.push({
          name: 'matrix',
          a: numbers[0],
          b: numbers[1],
          c: numbers[2],
          d: numbers[3],
          e: numbers[4],
          f: numbers[5],
        });

        break;
      case 'rotate':
        {
          if (args.length !== 1 && args.length !== 3) {
            throw new SVGTransformParseError(
              `rotate must have 1 or 3 arguments: "${args}.join(' ')"`,
            );
          }
          // See https://www.w3.org/TR/css-transforms-1/#svg-transform-functions for generation of translate.
          const needTranslate =
            numbers.length === 3 &&
            (!numbers[1].isZero() || !numbers[2].isZero());
          if (needTranslate) {
            transforms.push(createTranslate(numbers[1], numbers[2]));
          }
          transforms.push({
            name: 'rotate',
            a: { n: numbers[0], unit: 'deg' },
          });
          if (needTranslate) {
            transforms.push(
              createTranslate(numbers[1].negate(), numbers[2].negate()),
            );
          }
        }
        break;
      case 'scale':
        {
          if (args.length !== 1 && args.length !== 2) {
            throw new SVGTransformParseError(
              `scale must have 1 or 2 arguments: "${args}.join(' ')"`,
            );
          }
          const sy = numbers.length === 2 ? numbers[1] : numbers[0];
          transforms.push({
            name: 'scale',
            sx: numbers[0],
            sy: sy,
          });
        }
        break;
      case 'skewX':
      case 'skewY':
        if (args.length !== 1) {
          throw new SVGTransformParseError(
            `${name} must have 1 argument: "${args}.join(' ')"`,
          );
        }
        transforms.push({
          name: name,
          a: { n: numbers[0], unit: 'deg' },
        });
        break;
      case 'translate':
        if (args.length !== 1 && args.length !== 2) {
          throw new SVGTransformParseError(
            `translate must have 1 or 2 arguments: "${args}.join(' ')"`,
          );
        }
        transforms.push(
          createTranslate(
            numbers[0],
            numbers.length === 2 ? numbers[1] : ExactNum.zero(),
          ),
        );
        break;
      default:
        throw new SVGTransformParseError(`invalid function "${name}"`);
    }
  }
  return transforms;
}

/**
 * @param {import('../types-transform.js').TransformFn[]} transforms
 * @returns {string}
 */
export function svgStringifyTransform(transforms) {
  let str = '';
  for (let index = 0; index < transforms.length; index++) {
    const fn = transforms[index];
    if (index <= transforms.length - 3 && fn.name === 'translate') {
      const rotate = transforms[index + 1];
      if (rotate.name === 'rotate') {
        const translate = transforms[index + 2];
        if (
          translate.name === 'translate' &&
          translate.x.n.negate().isEqualTo(fn.x.n) &&
          translate.y.n.negate().isEqualTo(fn.y.n)
        ) {
          str += `rotate(${rotate.a.n.getMinifiedString()} ${fn.x.n.getMinifiedString()} ${fn.y.n.getMinifiedString()})`;
          index += 2;
          continue;
        }
      }
    }
    str += stringifyFn(fn);
  }
  return str;
}

/**
 * @param {import('../types-transform.js').TransformFn[]} transforms
 * @returns {string}
 */
export function svgStringifyTransformAsProperty(transforms) {
  /**
   * @param {import('../types-transform.js').TransformFn} transform
   */
  function stringify(transform) {
    switch (transform.name) {
      case 'matrix':
        return `matrix(${transform.a.getMinifiedString()},${transform.b.getMinifiedString()},${transform.c.getMinifiedString()},${transform.d.getMinifiedString()},${transform.e.getMinifiedString()},${transform.f.getMinifiedString()})`;
      case 'rotate':
        return `rotate(${stringifyPropAngle(transform.a)})`;
      case 'scale':
        if (
          transform.sx.getMinifiedString() === transform.sy.getMinifiedString()
        ) {
          return `scale(${transform.sx.getMinifiedString()})`;
        } else {
          return `scale(${transform.sx.getMinifiedString()},${transform.sy.getMinifiedString()})`;
        }
      case 'skewX':
      case 'skewY':
        return `${transform.name}(${transform.a.n.getMinifiedString()}${transform.a.unit})`;
      case 'translate':
        return stringifyPropTranslate(transform.x, transform.y);
      default:
        throw new Error();
    }
  }
  return transforms.reduce(
    (str, transform) => (str += stringify(transform)),
    '',
  );
}

// Internal unilities

/**
 * @param {string[]} args
 * @returns {ExactNum[]}
 */
function getNumbers(args) {
  return args.map((n) => {
    if (!isNumber(n)) {
      throw new SVGTransformParseError(`"${n}" is not a number`);
    }
    return new ExactNum(n);
  });
}

/**
 * @param {ExactNum} tx
 * @param {ExactNum} ty
 * @returns {import('../types-transform.js').TransformFnTranslate}
 */
function createTranslate(tx, ty) {
  return {
    name: 'translate',
    x: { n: tx, unit: 'px' },
    y: { n: ty, unit: 'px' },
  };
}

/**
 * @param {import('../types-transform.js').TransformFn} transform
 */
function stringifyFn(transform) {
  switch (transform.name) {
    case 'matrix':
      return `matrix(${transform.a.getMinifiedString()} ${transform.b.getMinifiedString()} ${transform.c.getMinifiedString()} ${transform.d.getMinifiedString()} ${transform.e.getMinifiedString()} ${transform.f.getMinifiedString()})`;
    case 'rotate':
      return `rotate(${transform.a.n.getMinifiedString()})`;
    case 'scale':
      if (
        transform.sx.getMinifiedString() === transform.sy.getMinifiedString()
      ) {
        return `scale(${transform.sx.getMinifiedString()})`;
      } else {
        return `scale(${transform.sx.getMinifiedString()} ${transform.sy.getMinifiedString()})`;
      }
    case 'skewX':
    case 'skewY':
      return `${transform.name}(${transform.a.n.getMinifiedString()})`;
    case 'translate':
      if (transform.y.n.isZero()) {
        return `translate(${transform.x.n.getMinifiedString()})`;
      } else {
        return `translate(${transform.x.n.getMinifiedString()} ${transform.y.n.getMinifiedString()})`;
      }
    default:
      throw new Error();
  }
}

/**
 * @param {import('../types-transform.js').TransTypeAngle} a
 * @returns {string}
 */
function stringifyPropAngle(a) {
  return `${a.n.getMinifiedString()}${a.unit}`;
}

/**
 * @param {import('../types-transform.js').TransTypeLength} len
 * @returns {string}
 */
function stringifyPropLength(len) {
  return len.n.isZero() ? '0' : `${len.n.getMinifiedString()}${len.unit}`;
}

/**
 * @param {import('../types-transform.js').TransTypeLength} tx
 * @param {import('../types-transform.js').TransTypeLength} ty
 * @returns {string}
 */
function stringifyPropTranslate(tx, ty) {
  if (ty.n.isZero()) {
    return `translate(${stringifyPropLength(tx)})`;
  } else {
    return `translate(${stringifyPropLength(tx)},${stringifyPropLength(ty)})`;
  }
}
