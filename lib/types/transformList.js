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
   * @param {function(TransformList):string} fnStringify
   * @returns {TransformList}
   */
  #findShortest(fnStringify) {
    if (this.#transforms.length === 0) {
      return this;
    }
    const variants = getVariants(this.#transforms);
    let length = fnStringify(this).length;
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
   * @returns {TransformList}
   */
  findShortestAttribute() {
    return this.#findShortest((t) => t.toString());
  }

  /**
   * @returns {TransformList}
   */
  findShortestProperty() {
    return this.#findShortest((t) => t.toStyleAttString());
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
      if (transform.e.isZero() && transform.f.isZero()) {
        const a = transform.a.getValue();
        const b = transform.b.getValue();
        const c = transform.c.getValue();
        const d = transform.d.getValue();
        if (a === 0 && d === 0) {
          if (b === 1 && c === -1) {
            return addNormalizedTransform(minified, createRotate(90));
          }
          if (b === -1 && c === 1) {
            return addNormalizedTransform(minified, createRotate(270));
          }
        } else if (b === 0) {
          if (a === 1 && c === 1 && d === 1) {
            return addNormalizedTransform(minified, {
              name: 'skewX',
              a: { n: new ExactNum(45), unit: 'deg' },
            });
          }
        } else if (c === 0) {
          if (a === 1 && b === 1 && d === 1) {
            return addNormalizedTransform(minified, {
              name: 'skewY',
              a: { n: new ExactNum(45), unit: 'deg' },
            });
          }
        }
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
            return addNormalizedTransform(
              minified.slice(0, -1),
              createRotate(angle, last.a.unit),
            );
          }
        }
        // Make sure the 0 <= angle < 360
        if (transform.a.unit === 'deg') {
          const deg = transform.a.n.getValue();
          if (deg < 0 || deg >= 360) {
            return addNormalizedTransform(
              minified,
              createRotate((deg % 360) + (deg < 0 ? 360 : 0)),
            );
          }
          if (deg === 180) {
            return addNormalizedTransform(minified, {
              name: 'scale',
              sx: new ExactNum(-1),
              sy: new ExactNum(-1),
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
 * @param {import('../types-transform.js').TransformFn} f
 * @returns {import('../types-transform.js').TransformFnMatrix|undefined}
 */
function convertToMatrix(f) {
  switch (f.name) {
    case 'matrix':
      return f;
    case 'scale':
      return createMatrix(f.sx, 0, 0, f.sy, 0, 0);
    case 'translate':
      if (f.x.unit !== 'px' || f.y.unit !== 'px') {
        return;
      }
      return createMatrix(1, 0, 0, 1, f.x.n, f.y.n);
  }
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
 * @param {number|ExactNum} n
 * @param {import('../types-transform.js').TransTypeAngleUnit} [unit='deg']
 * @returns {import('../types-transform.js').TransformFnRotate}
 */
function createRotate(n, unit = 'deg') {
  return {
    name: 'rotate',
    a: { n: typeof n === 'number' ? new ExactNum(n) : n, unit: unit },
  };
}

/**
 * @param {ExactNum} a
 * @param {ExactNum} b
 * @param {ExactNum} c
 * @param {ExactNum} d
 * @param {ExactNum} [e]
 * @returns {ExactNum|undefined}
 */
function getMatrixEl(a, b, c, d, e) {
  const ab = a.mul(b);
  const cd = c.mul(d);
  if (!ab || !cd) {
    return;
  }
  const abcd = ab.add(cd);
  return abcd === undefined || e === undefined ? abcd : abcd.add(e);
}

/**
 * @param {import('../types-transform.js').TransformFn[]} transforms
 * @returns {TransformList[]}
 */
function getVariants(transforms) {
  /** @type {TransformList[]} */
  const variants = [];

  if (transforms.length > 1 || transforms[0].name !== 'matrix') {
    const matrix = multiplyTransforms(transforms);
    if (matrix) {
      variants.push(new TransformList([matrix]));
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

/**
 * @param {import('../types-transform.js').TransformFnMatrix} m1
 * @param {import('../types-transform.js').TransformFnMatrix} m2
 * @returns {import('../types-transform.js').TransformFnMatrix|undefined}
 */
function multiplyMatrices(m1, m2) {
  const a = getMatrixEl(m1.a, m2.a, m1.c, m2.b);
  const b = getMatrixEl(m1.b, m2.a, m1.d, m2.b);
  const c = getMatrixEl(m1.a, m2.c, m1.c, m2.d);
  const d = getMatrixEl(m1.b, m2.c, m1.d, m2.d);
  const e = getMatrixEl(m1.a, m2.e, m1.c, m2.f, m1.e);
  const f = getMatrixEl(m1.b, m2.e, m1.d, m2.f, m1.f);
  if (a && b && c && d && e && f) {
    return createMatrix(a, b, c, d, e, f);
  }
}

/**
 * @param {import('../types-transform.js').TransformFn[]} transforms
 * @return {import('../types-transform.js').TransformFnMatrix|undefined}
 */
function multiplyTransforms(transforms) {
  let result = convertToMatrix(transforms[0]);
  if (result == undefined) {
    return;
  }
  for (let index = 1; index < transforms.length; index++) {
    const m = convertToMatrix(transforms[index]);
    if (m === undefined) {
      return;
    }
    result = multiplyMatrices(result, m);
    if (result === undefined) {
      return;
    }
  }
  return result;
}
