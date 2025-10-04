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
          const tx = new ExactNum(t.data.length === 3 ? t.data[1] : 0);
          const ty = new ExactNum(t.data.length === 3 ? t.data[2] : 0);
          transforms.push({
            name: 'rotate',
            a: { n: new ExactNum(t.data[0]), unit: 'deg' },
            tx: { n: tx, unit: 'px' },
            ty: { n: ty, unit: 'px' },
          });
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
        {
          const y = new ExactNum(t.data.length === 2 ? t.data[1] : 0);
          transforms.push({
            name: 'translate',
            x: { n: new ExactNum(t.data[0]), unit: 'px' },
            y: { n: y, unit: 'px' },
          });
        }
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
  /**
   * @param {import('./types-transform.js').TransformFn} transform
   */
  function stringify(transform) {
    switch (transform.name) {
      case 'matrix':
        return `matrix(${transform.a.getMinifiedString()} ${transform.b.getMinifiedString()} ${transform.c.getMinifiedString()} ${transform.d.getMinifiedString()} ${transform.e.getMinifiedString()} ${transform.f.getMinifiedString()})`;
      case 'rotate':
        if (transform.tx.n.isZero() && transform.ty.n.isZero()) {
          return `rotate(${transform.a.n.getMinifiedString()})`;
        }
        return `rotate(${transform.a.n.getMinifiedString()} ${transform.tx.n.getMinifiedString()} ${transform.ty.n.getMinifiedString()})`;
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
  return transforms.reduce(
    (str, transform) => (str += stringify(transform)),
    '',
  );
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
        if (transform.tx.n.isZero() && transform.ty.n.isZero()) {
          return `rotate(${transform.a.n.getMinifiedString()}deg)`;
        }
        return `rotate(${transform.a.n.getMinifiedString()}deg ${transform.tx.n.getMinifiedString()} ${transform.ty.n.getMinifiedString()})`;
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
        if (transform.y.n.isZero()) {
          return `translate(${transform.x.n.getMinifiedString()}${transform.x.unit})`;
        } else {
          return `translate(${transform.x.n.getMinifiedString()}${transform.x.unit},${transform.y.n.getMinifiedString()}${transform.y.unit})`;
        }
      default:
        throw new Error();
    }
  }
  return transforms.reduce(
    (str, transform) => (str += stringify(transform)),
    '',
  );
}
