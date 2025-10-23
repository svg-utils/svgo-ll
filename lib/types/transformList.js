import { ExactNum } from '../exactnum.js';
import {
  svgParseTransform,
  svgStringifyTransform,
  svgStringifyTransformAsProperty,
} from '../svg-parse-att.js';
import { DataType } from './dataType.js';

export class TransformList extends DataType {
  /** @type {import('../types-transform.js').TransformFn[]} */
  #transforms;

  /** @type {string|undefined} */
  #strValue;
  /** @type {string|undefined} */
  #strValueStyle;

  /**
   * @param {string|import('../types-transform.js').TransformFn[]} value
   */
  constructor(value) {
    super();
    this.#transforms =
      typeof value === 'string' ? svgParseTransform(value) : value;
  }

  /**
   * @returns {TransformList}
   */
  findShortestAttribute() {
    const variants = getVariants(this.#transforms);
    let length = this.toString().length;
    /** @type {TransformList} */
    let shortest = this;
    for (const variant of variants) {
      const vLen = variant.toString().length;
      if (vLen < length) {
        length = vLen;
        shortest = variant;
      }
    }
    return shortest;
  }

  /**
   * @returns {import('../types-transform.js').TransformFn[]}
   */
  getTransforms() {
    return this.#transforms;
  }

  /**
   * @returns {boolean}
   */
  isIdentityTransform() {
    return !this.#transforms.some((t) => !isIdentityTransform(t));
  }

  /**
   * @returns {TransformList}
   */
  normalize() {
    /** @type {import('../types-transform.js').TransformFn[]} */
    let minified = [];
    for (let index = 0; index < this.#transforms.length; index++) {
      const transform = this.#transforms[index];
      minified = addNormalizedTransform(minified, transform);
    }
    return new TransformList(minified);
  }

  toString() {
    if (!this.#strValue) {
      this.#strValue = svgStringifyTransform(this.#transforms);
    }
    return this.#strValue;
  }

  toStyleAttString() {
    if (!this.#strValueStyle) {
      this.#strValueStyle = svgStringifyTransformAsProperty(this.#transforms);
    }
    return this.#strValueStyle;
  }
}

/**
 * @param {import('../types-transform.js').TransformFn[]} minified
 * @param {import('../types-transform.js').TransformFn} transform
 * @returns {import('../types-transform.js').TransformFn[]}
 */
function addNormalizedTransform(minified, transform) {
  if (isIdentityTransform(transform)) {
    return minified;
  }
  switch (transform.name) {
    case 'matrix':
      // Pull out simple transforms where possible.
      if (transform.b.isZero() && transform.c.isZero()) {
        minified = addNormalizedTransform(minified, {
          name: 'translate',
          x: { n: transform.e, unit: 'px' },
          y: { n: transform.f, unit: 'px' },
        });
        return addNormalizedTransform(minified, {
          name: 'scale',
          sx: transform.a,
          sy: transform.d,
        });
      }
      break;
    case 'rotate':
      {
        // If last one was rotate, merge them.
        const last = minified[minified.length - 1];
        if (
          last !== undefined &&
          last.name === 'rotate' &&
          canMergeRotates(last, transform)
        ) {
          const angle = last.a.n.add(transform.a.n);
          if (angle) {
            return addNormalizedTransform(minified.slice(0, -1), {
              name: 'rotate',
              a: {
                n: angle,
                unit: last.a.unit,
              },
            });
          }
        }
        // Make sure the 0 <= angle < 360
        if (transform.a.unit === 'deg') {
          const deg = transform.a.n.getValue();
          if (deg < 0 || deg >= 360) {
            return addNormalizedTransform(minified, {
              name: 'rotate',
              a: {
                n: new ExactNum((deg % 360) + (deg < 0 ? 360 : 0)),
                unit: 'deg',
              },
            });
          }
        }
      }
      break;
    case 'scale':
      {
        // If last one was scale, merge them.
        const last = minified[minified.length - 1];
        if (last !== undefined && last.name === 'scale') {
          const sx = last.sx.mul(transform.sx);
          const sy = last.sy.mul(transform.sy);
          if (sx && sy) {
            return addNormalizedTransform(minified.slice(0, -1), {
              name: 'scale',
              sx: sx,
              sy: sy,
            });
          }
        }
      }
      break;
    case 'translate':
      {
        // If last one was translate, merge them.
        const last = minified[minified.length - 1];
        if (
          last !== undefined &&
          last.name === 'translate' &&
          canMergeTranslates(last, transform)
        ) {
          const x = last.x.n.add(transform.x.n);
          const y = last.y.n.add(transform.y.n);
          if (x && y) {
            return addNormalizedTransform(minified.slice(0, -1), {
              name: 'translate',
              x: { n: x, unit: last.x.unit },
              y: { n: y, unit: last.y.unit },
            });
          }
        }
      }
      break;
  }

  minified.push(transform);
  return minified;
}

/**
 * @param {import('../types-transform.js').TransformFnRotate} _r1
 * @param {import('../types-transform.js').TransformFnRotate} _r2
 * @returns {boolean}
 */
function canMergeRotates(_r1, _r2) {
  return true;
}

/**
 * @param {import('../types-transform.js').TransformFnTranslate} t1
 * @param {import('../types-transform.js').TransformFnTranslate} t2
 * @returns {boolean}
 */
function canMergeTranslates(t1, t2) {
  return t1.x.unit === t2.x.unit && t1.x.unit === t2.x.unit;
}

/**
 * @param {number|ExactNum} a
 * @param {number|ExactNum} b
 * @param {number|ExactNum} c
 * @param {number|ExactNum} d
 * @param {number|ExactNum} e
 * @param {number|ExactNum} f
 * @returns {import('../types-transform.js').TransformFnMatrix}
 */
function createMatrix(a, b, c, d, e, f) {
  return {
    name: 'matrix',
    a: typeof a === 'number' ? new ExactNum(a) : a,
    b: typeof b === 'number' ? new ExactNum(b) : b,
    c: typeof c === 'number' ? new ExactNum(c) : c,
    d: typeof d === 'number' ? new ExactNum(d) : d,
    e: typeof e === 'number' ? new ExactNum(e) : e,
    f: typeof f === 'number' ? new ExactNum(f) : f,
  };
}

/**
 * @param {import('../types-transform.js').TransformFn[]} transforms
 * @returns {TransformList[]}
 */
function getVariants(transforms) {
  /** @type {TransformList[]} */
  const variants = [];

  if (transforms.length == 2) {
    const t = transforms[0];
    const s = transforms[1];
    if (
      t.name === 'translate' &&
      t.x.unit === 'px' &&
      t.y.unit === 'px' &&
      s.name === 'scale'
    ) {
      variants.push(
        new TransformList([createMatrix(s.sx, 0, 0, s.sy, t.x.n, t.y.n)]),
      );
    }
  }
  return variants;
}

/**
 * @param {import('../types-transform.js').TransformFn} t
 * @returns {boolean}
 */
function isIdentityTransform(t) {
  switch (t.name) {
    case 'matrix':
      return (
        t.a.getValue() === 1 &&
        t.d.getValue() === 1 &&
        t.b.isZero() &&
        t.c.isZero() &&
        t.e.isZero() &&
        t.f.isZero()
      );
    case 'rotate':
    case 'skewX':
    case 'skewY':
      return t.a.n.isZero();
    case 'scale':
      return t.sx.getValue() === 1 && t.sy.getValue() === 1;
    case 'translate':
      return t.x.n.isZero() && t.y.n.isZero();
  }
}
