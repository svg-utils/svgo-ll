import { toFixed } from '../lib/svgo/tools.js';

/**
 * @deprecated
 * @typedef {{ name: string, data: number[] }} TransformItem
 * @typedef {{
 *   convertToShorts: boolean,
 *   degPrecision?: number,
 *   floatPrecision: number,
 *   transformPrecision: number,
 *   matrixToTransform: boolean,
 *   shortTranslate: boolean,
 *   shortScale: boolean,
 *   shortRotate: boolean,
 *   removeUseless: boolean,
 *   collapseIntoOne: boolean,
 *   leadingZero: boolean,
 *   negativeExtraSpace: boolean,
 * }} TransformParams
 */

const transformTypes = new Set([
  'matrix',
  'rotate',
  'scale',
  'skewX',
  'skewY',
  'translate',
]);

const regTransformSplit =
  /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(.+?)\s*\)[\s,]*/;
const regNumericValues = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

/**
 * Convert transform string to JS representation.
 *
 * @param {string} transformString
 * @returns {TransformItem[]} Object representation of transform, or an empty array if it was malformed.
 * @deprecated
 */
export const transform2js = (transformString) => {
  /** @type {TransformItem[]} */
  const transforms = [];
  /** @type {?TransformItem} */
  let currentTransform = null;

  // split value into ['', 'translate', '10 50', '', 'scale', '2', '', 'rotate', '-45', '']
  for (const item of transformString.split(regTransformSplit)) {
    if (!item) {
      continue;
    }

    if (transformTypes.has(item)) {
      currentTransform = { name: item, data: [] };
      transforms.push(currentTransform);
    } else {
      let num;
      // then split it into [10, 50] and collect as context.data
      while ((num = regNumericValues.exec(item))) {
        num = Number(num);
        if (currentTransform != null) {
          currentTransform.data.push(num);
        }
      }
    }
  }

  return currentTransform == null || currentTransform.data.length == 0
    ? []
    : transforms;
};

/**
 * Multiply transforms into one.
 *
 * @param {TransformItem[]} transforms
 * @returns {TransformItem}
 */
export const transformsMultiply = (transforms) => {
  const matrixData = transforms.map((transform) => {
    if (transform.name === 'matrix') {
      return transform.data;
    }
    return transformToMatrix(transform);
  });

  const matrixTransform = {
    name: 'matrix',
    data:
      matrixData.length > 0 ? matrixData.reduce(multiplyTransformMatrices) : [],
  };

  return matrixTransform;
};

/**
 * Math utilities in radians.
 */
const mth = {
  /**
   * @param {number} deg
   * @returns {number}
   */
  rad: (deg) => {
    return (deg * Math.PI) / 180;
  },

  /**
   * @param {number} rad
   * @returns {number}
   */
  deg: (rad) => {
    return (rad * 180) / Math.PI;
  },

  /**
   * @param {number} deg
   * @returns {number}
   */
  cos: (deg) => {
    return Math.cos(mth.rad(deg));
  },

  /**
   * @param {number} val
   * @param {number} floatPrecision
   * @returns {number}
   */
  acos: (val, floatPrecision) => {
    return toFixed(mth.deg(Math.acos(val)), floatPrecision);
  },

  /**
   * @param {number} deg
   * @returns {number}
   */
  sin: (deg) => {
    return Math.sin(mth.rad(deg));
  },

  /**
   * @param {number} val
   * @param {number} floatPrecision
   * @returns {number}
   */
  asin: (val, floatPrecision) => {
    return toFixed(mth.deg(Math.asin(val)), floatPrecision);
  },

  /**
   * @param {number} deg
   * @returns {number}
   */
  tan: (deg) => {
    return Math.tan(mth.rad(deg));
  },

  /**
   * @param {number} val
   * @param {number} floatPrecision
   * @returns {number}
   */
  atan: (val, floatPrecision) => {
    return toFixed(mth.deg(Math.atan(val)), floatPrecision);
  },
};

/**
 * Convert transform to the matrix data.
 *
 * @type {(transform: TransformItem) => number[] }
 */
const transformToMatrix = (transform) => {
  if (transform.name === 'matrix') {
    return transform.data;
  }
  switch (transform.name) {
    case 'translate':
      // [1, 0, 0, 1, tx, ty]
      return [1, 0, 0, 1, transform.data[0], transform.data[1] || 0];
    case 'scale':
      // [sx, 0, 0, sy, 0, 0]
      return [
        transform.data[0],
        0,
        0,
        transform.data[1] ?? transform.data[0],
        0,
        0,
      ];
    case 'rotate':
      // [cos(a), sin(a), -sin(a), cos(a), x, y]
      var cos = mth.cos(transform.data[0]),
        sin = mth.sin(transform.data[0]),
        cx = transform.data[1] || 0,
        cy = transform.data[2] || 0;
      return [
        cos,
        sin,
        -sin,
        cos,
        (1 - cos) * cx + sin * cy,
        (1 - cos) * cy - sin * cx,
      ];
    case 'skewX':
      // [1, 0, tan(a), 1, 0, 0]
      return [1, 0, mth.tan(transform.data[0]), 1, 0, 0];
    case 'skewY':
      // [1, tan(a), 0, 1, 0, 0]
      return [1, mth.tan(transform.data[0]), 0, 1, 0, 0];
    default:
      throw Error(`Unknown transform ${transform.name}`);
  }
};

/**
 * Applies transformation to an arc. To do so, we represent ellipse as a matrix, multiply it
 * by the transformation matrix and use a singular value decomposition to represent in a form
 * rotate(θ)·scale(a b)·rotate(φ). This gives us new ellipse params a, b and θ.
 * SVD is being done with the formulae provided by Wolffram|Alpha (svd {{m0, m2}, {m1, m3}})
 *
 * @type {(
 *   cursor: [x: number, y: number],
 *   arc: number[],
 *   transform: number[]
 * ) => number[]}
 */
export const transformArc = (cursor, arc, transform) => {
  const x = arc[5] - cursor[0];
  const y = arc[6] - cursor[1];
  let a = arc[0];
  let b = arc[1];
  const rot = (arc[2] * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  // skip if radius is 0
  if (a > 0 && b > 0) {
    let h =
      Math.pow(x * cos + y * sin, 2) / (4 * a * a) +
      Math.pow(y * cos - x * sin, 2) / (4 * b * b);
    if (h > 1) {
      h = Math.sqrt(h);
      a *= h;
      b *= h;
    }
  }
  const ellipse = [a * cos, a * sin, -b * sin, b * cos, 0, 0];
  const m = multiplyTransformMatrices(transform, ellipse);
  // Decompose the new ellipse matrix
  const lastCol = m[2] * m[2] + m[3] * m[3];
  const squareSum = m[0] * m[0] + m[1] * m[1] + lastCol;
  const root =
    Math.hypot(m[0] - m[3], m[1] + m[2]) * Math.hypot(m[0] + m[3], m[1] - m[2]);

  if (!root) {
    // circle
    arc[0] = arc[1] = Math.sqrt(squareSum / 2);
    arc[2] = 0;
  } else {
    const majorAxisSqr = (squareSum + root) / 2;
    const minorAxisSqr = (squareSum - root) / 2;
    const major = Math.abs(majorAxisSqr - lastCol) > 1e-6;
    const sub = (major ? majorAxisSqr : minorAxisSqr) - lastCol;
    const rowsSum = m[0] * m[2] + m[1] * m[3];
    const term1 = m[0] * sub + m[2] * rowsSum;
    const term2 = m[1] * sub + m[3] * rowsSum;
    arc[0] = Math.sqrt(majorAxisSqr);
    arc[1] = Math.sqrt(minorAxisSqr);
    arc[2] =
      (((major ? term2 < 0 : term1 > 0) ? -1 : 1) *
        Math.acos((major ? term1 : term2) / Math.hypot(term1, term2)) *
        180) /
      Math.PI;
  }

  if (transform[0] < 0 !== transform[3] < 0) {
    // Flip the sweep flag if coordinates are being flipped horizontally XOR vertically
    arc[4] = 1 - arc[4];
  }

  return arc;
};

/**
 * Multiply transformation matrices.
 *
 * @type {(a: number[], b: number[]) => number[]}
 */
const multiplyTransformMatrices = (a, b) => {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
};
