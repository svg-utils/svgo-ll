import { transform2js } from '../plugins/_transforms.js';
import { ExactNum } from './exactnum.js';

/**
 * @param {string} str
 * @returns {import('./types-transform.js').TransformFn[]}
 */
export function svgParseTransform(str) {
  const genericTransforms = transform2js(str);
  /** @type {import('./types-transform.js').TransformFn[]} */
  const transforms = [];
  for (const t of genericTransforms) {
    switch (t.name) {
      case 'matrix':
        transforms.push({
          name: 'matrix',
          a: new ExactNum(t.data[0]),
          b: new ExactNum(t.data[1]),
          c: new ExactNum(t.data[2]),
          d: new ExactNum(t.data[3]),
          e: new ExactNum(t.data[4]),
          f: new ExactNum(t.data[5]),
        });
        break;
      case 'rotate':
        {
          // See https://www.w3.org/TR/css-transforms-1/#svg-transform-functions for generation of translate.
          const needTranslate =
            t.data.length === 3 && (t.data[1] !== 0 || t.data[2] !== 0);
          if (needTranslate) {
            transforms.push(createTranslate(t.data[1], t.data[2]));
          }
          transforms.push({
            name: 'rotate',
            a: { n: new ExactNum(t.data[0]), unit: 'deg' },
          });
          if (needTranslate) {
            transforms.push(createTranslate(-t.data[1], -t.data[2]));
          }
        }
        break;
      case 'scale':
        {
          const sy = new ExactNum(t.data.length === 2 ? t.data[1] : t.data[0]);
          transforms.push({
            name: 'scale',
            sx: new ExactNum(t.data[0]),
            sy: sy,
          });
        }
        break;
      case 'skewX':
      case 'skewY':
        transforms.push({
          name: t.name,
          a: { n: new ExactNum(t.data[0]), unit: 'deg' },
        });
        break;
      case 'translate':
        transforms.push(
          createTranslate(t.data[0], t.data.length === 2 ? t.data[1] : 0),
        );
        break;
      default:
        throw new Error();
    }
  }
  return transforms;
}

/**
 * @param {import('./types-transform.js').TransformFn[]} transforms
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
 * @param {import('./types-transform.js').TransformFn[]} transforms
 * @returns {string}
 */
export function svgStringifyTransformAsProperty(transforms) {
  /**
   * @param {import('./types-transform.js').TransformFn} transform
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
 * @param {number} tx
 * @param {number} ty
 * @returns {import('./types-transform.js').TransformFnTranslate}
 */
function createTranslate(tx, ty) {
  return {
    name: 'translate',
    x: { n: new ExactNum(tx), unit: 'px' },
    y: { n: new ExactNum(ty), unit: 'px' },
  };
}

/**
 * @param {import('./types-transform.js').TransformFn} transform
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
 * @param {import('./types-transform.js').TransTypeAngle} a
 * @returns {string}
 */
function stringifyPropAngle(a) {
  return `${a.n.getMinifiedString()}${a.unit}`;
}

/**
 * @param {import('./types-transform.js').TransTypeLength} len
 * @returns {string}
 */
function stringifyPropLength(len) {
  return len.n.isZero() ? '0' : `${len.n.getMinifiedString()}${len.unit}`;
}

/**
 * @param {import('./types-transform.js').TransTypeLength} tx
 * @param {import('./types-transform.js').TransTypeLength} ty
 * @returns {string}
 */
function stringifyPropTranslate(tx, ty) {
  if (ty.n.isZero()) {
    return `translate(${stringifyPropLength(tx)})`;
  } else {
    return `translate(${stringifyPropLength(tx)},${stringifyPropLength(ty)})`;
  }
}
