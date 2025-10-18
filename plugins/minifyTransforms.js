import { exactAdd, exactMul, minifyNumber } from '../lib/svgo/tools.js';
import { transform2js } from './_transforms.js';

/**
 * @typedef {{ name: string, data: number[] }} TransformItem
 */

export const name = 'minifyTransforms';
export const description = 'Make transform expressions as short as possible';

/**
 * Make transform expressions as short as possible.
 *
 * @type {import('./plugins-types.js').Plugin<'minifyTransforms'>}
 */
export const fn = () => {
  return {
    element: {
      enter: (element) => {
        /** @param {string} attName */
        function processAttribute(attName) {
          const input = element.svgAtts.get(attName);
          if (input === undefined) {
            return;
          }
          const output = minifyTransforms(input.toString());
          if (output) {
            element.svgAtts.set(attName, output);
          } else {
            element.svgAtts.delete(attName);
          }
        }
        ['transform', 'gradientTransform', 'patternTransform'].forEach(
          (attName) => processAttribute(attName),
        );
      },
    },
  };
};

/**
 * @param {string} transforms
 * @returns {string}
 */
function minifyTransforms(transforms) {
  const parsedOriginal = transform2js(transforms);

  const losslessOriginal = normalize(parsedOriginal);
  const candidates = [losslessOriginal];

  return getShortest(candidates).str;
}

/**
 * @param {TransformItem[][]} candidates
 */
function getShortest(candidates) {
  let shortest = jsToString(candidates[0]);
  let shortestIndex = 0;
  for (let index = 1; index < candidates.length; index++) {
    const str = jsToString(candidates[index]);
    if (str.length < shortest.length) {
      shortest = str;
      shortestIndex = index;
    }
  }
  return { transforms: candidates[shortestIndex], str: shortest };
}

/**
 * @param {TransformItem[]} transforms
 * @returns {TransformItem[]}
 */
function normalize(transforms) {
  /**
   * @param {TransformItem[]} transforms
   */
  function mergeAdjacentScaleRotate(transforms) {
    /**
     * @param {TransformItem} origRotate
     * @param {TransformItem} origScale
     */
    function getNewScaleAndRotate(origRotate, origScale) {
      /** @type {{rotate:TransformItem,scale?:TransformItem}} */
      const rs = {
        rotate: {
          name: 'rotate',
          data: [
            exactAdd(origRotate.data[0], 180),
            ...origRotate.data.slice(1),
          ],
        },
      };
      const sx = origScale.data[0];
      const sy = origScale.data[1] ?? sx;
      if (sx === -1 && sy === -1) {
        // Scale will drop out, this will always be shorter.
        return rs;
      }
      rs.scale = { name: 'scale', data: [-sx, -sy] };
      return rs;
    }

    const merged = [];
    for (let index = 0; index < transforms.length; index++) {
      const t = transforms[index];
      const next = transforms[index + 1];
      if (next) {
        switch (t.name) {
          case 'rotate':
            // If the next one is a scale, use the shortest of the current sequence and
            // rotate (a+180)scale(-sx,-sy).
            if (
              (t.data.length === 1 || (t.data[1] === 0 && t.data[2] === 0)) &&
              next.name === 'scale'
            ) {
              const current = [t, next];
              const rs = getNewScaleAndRotate(t, next);
              if (!rs.scale) {
                merged.push(rs.rotate);
                index++;
                continue;
              }
              const shortest = getShortest([current, [rs.rotate, rs.scale]]);
              merged.push(...shortest.transforms);
              index++;
              continue;
            }
            break;
          case 'scale':
            // If the next one is a rotate, use the shortest of the current sequence and
            // scale(-sx,-sy)rotate (a+180).
            if (
              next.name === 'rotate' &&
              (next.data.length === 1 ||
                (next.data[1] === 0 && next.data[2] === 0))
            ) {
              const current = [t, next];
              const rs = getNewScaleAndRotate(next, t);
              if (!rs.scale) {
                merged.push(rs.rotate);
                index++;
                continue;
              }
              const shortest = getShortest([
                current,
                [rs.scale, rs.rotate],
              ]).transforms;
              // If the scales are equal, flip the scale and the rotate so the order is predictable.
              if (rs.scale.data[0] === rs.scale.data[1]) {
                merged.push(shortest[1], shortest[0]);
              } else {
                merged.push(...shortest);
              }
              index++;
              continue;
            }
            break;
        }
      }
      merged.push(t);
    }
    return merged;
  }

  /**
   *
   * @param {TransformItem} t1
   * @param {TransformItem} t2
   * @returns {TransformItem|undefined}
   */
  function mergeTransforms(t1, t2) {
    switch (t1.name) {
      case 'matrix':
        if (t2.name == 'matrix') {
          const m = mulMatrices(t1.data, t2.data);
          if (m) {
            return m;
          }
        }
        break;
      case 'rotate':
        if (
          t2.name === 'rotate' &&
          t1.data[1] === t2.data[1] &&
          t1.data[2] === t2.data[2]
        ) {
          // Add the angles if cx and cy are the same.
          return normalizeTransform({
            name: 'rotate',
            data: [t1.data[0] + t2.data[0], t1.data[1], t1.data[2]],
          });
        }
    }
    return;
  }

  /**
   * @param {number[]} m1
   * @param {number[]} m2
   * @returns {TransformItem|undefined}
   */
  function mulMatrices(m1, m2) {
    /**
     *
     * @param {number} a
     * @param {number} b
     * @param {number} c
     * @param {number} d
     */
    function mulAdd(a, b, c, d) {
      const ab = exactMul(a, b);
      const cd = exactMul(c, d);
      if (ab !== undefined && cd !== undefined) {
        return exactAdd(ab, cd);
      }
    }
    const [a1, b1, c1, d1, e1, f1] = m1;
    const [a2, b2, c2, d2, e2, f2] = m2;
    const a = mulAdd(a1, a2, c1, b2);
    const b = mulAdd(b1, a2, d1, b2);
    const c = mulAdd(a1, c2, c1, d2);
    const d = mulAdd(b1, c2, d1, d2);
    const e = mulAdd(a1, e2, c1, f2);
    const f = mulAdd(b1, e2, d1, f2);
    if (
      a !== undefined &&
      b !== undefined &&
      c !== undefined &&
      d !== undefined &&
      e !== undefined &&
      f !== undefined
    ) {
      return {
        name: 'matrix',
        data: [a, b, c, d, exactAdd(e, e1), exactAdd(f, f1)],
      };
    }
  }

  /**
   * @param {TransformItem} t
   */
  function normalizeTransform(t) {
    switch (t.name) {
      case 'rotate':
        {
          if (
            t.data.length === 1 ||
            (t.data[1] === 0 && t.data[2] === 0) ||
            t.data[0] % 360 === 0
          ) {
            // Convert to matrix if it's a multiple of 90 degrees.
            let cos, sin;
            switch (t.data[0] % 360) {
              case 0:
                cos = 1;
                sin = 0;
                break;
              case 90:
                cos = 0;
                sin = 1;
                break;
              case 180:
                cos = -1;
                sin = 0;
                break;
              case 270:
                cos = 0;
                sin = -1;
                break;
              default:
                return {
                  name: 'rotate',
                  data: t.data.length === 1 ? [t.data[0], 0, 0] : [...t.data],
                };
            }
            return { name: 'matrix', data: [cos, sin, -sin, cos, 0, 0] };
          }
        }
        return {
          name: 'rotate',
          data: t.data.length === 1 ? [t.data[0], 0, 0] : [...t.data],
        };
      case 'scale':
        return {
          name: 'matrix',
          data: [
            t.data[0],
            0,
            0,
            t.data.length > 1 ? t.data[1] : t.data[0],
            0,
            0,
          ],
        };
      case 'skewX':
      case 'skewY':
        switch (t.data[0] % 360) {
          case 0:
            return {
              name: 'matrix',
              data: [1, 0, 0, 1, 0, 0],
            };
        }
        return t;
      case 'translate':
        return {
          name: 'matrix',
          data: [1, 0, 0, 1, t.data[0], t.data.length > 1 ? t.data[1] : 0],
        };
      default:
        return t;
    }
  }

  /**
   * @param {TransformItem} t
   * @returns {TransformItem[]}
   */
  function shortenTransform(t) {
    let [a, b, c, d, e, f] = t.data;
    switch (t.name) {
      case 'matrix':
        if (b === 0 && c === 0) {
          // translate()scale()
          const result = [];
          if (e !== 0 || f !== 0) {
            result.push({ name: 'translate', data: [t.data[4], t.data[5]] });
          }
          if (a !== 1 || d !== 1) {
            result.push({ name: 'scale', data: [t.data[0], t.data[3]] });
          }
          if (result.length < 2) {
            return result;
          }
          return getShortest([[t], result]).transforms;
        }
        // Look for rotate(+/-90).
        if (a === 0 && b !== 0 && c !== 0 && d === 0 && e === 0 && f === 0) {
          const sx = b;
          const sy = -c;
          if (sx === 1 && sy === 1) {
            return [{ name: 'rotate', data: [90, 0, 0] }];
          }
          if (sx === -1 && sy === -1) {
            return [{ name: 'rotate', data: [-90, 0, 0] }];
          }
          const rs = [
            { name: 'rotate', data: [90, 0, 0] },
            { name: 'scale', data: [sx, sy] },
          ];
          return getShortest([rs, [t]]).transforms;
        }
        // Look for skew(+/-45)
        if (
          e === 0 &&
          f === 0 &&
          ((Math.abs(a) === Math.abs(c) && b === 0) ||
            (Math.abs(b) === Math.abs(d) && c === 0))
        ) {
          // skewX()
          const sx = a;
          const sy = d;
          const result = [];
          if (sx !== 1 || sy !== 1) {
            result.push({ name: 'scale', data: [sx, sy] });
          }
          if (b === 0) {
            const angle = c > 0 ? 45 : -45;
            result.push({ name: 'skewX', data: [a < 0 ? -angle : angle] });
          } else {
            const angle = b > 0 ? 45 : -45;
            result.push({ name: 'skewY', data: [d < 0 ? -angle : angle] });
          }
          return result;
        }
        break;
    }
    return [t];
  }

  let tryToMergeAgain = true;
  let mergedTransforms = [];
  while (tryToMergeAgain) {
    tryToMergeAgain = false;
    let currentTransform;
    for (const transform of transforms) {
      const normalized = normalizeTransform(transform);
      if (currentTransform) {
        const merged = mergeTransforms(currentTransform, normalized);
        if (merged) {
          currentTransform = merged;
          tryToMergeAgain = true;
        } else {
          mergedTransforms.push(currentTransform);
          currentTransform = normalized;
        }
      } else {
        currentTransform = normalized;
      }
    }
    if (currentTransform) {
      mergedTransforms.push(currentTransform);
    }
    if (tryToMergeAgain) {
      transforms = mergedTransforms;
      mergedTransforms = [];
    }
  }

  const shortened = [];
  for (const transform of mergedTransforms) {
    shortened.push(...shortenTransform(transform));
  }

  return mergeAdjacentScaleRotate(shortened);
}

/**
 * Convert transforms JS representation to string.
 *
 * @param {TransformItem[]} transformJS
 * @returns {string}
 */
export function jsToString(transformJS) {
  /**
   * @param {TransformItem} transform
   * @returns {number[]}
   */
  function minifyData(transform) {
    switch (transform.name) {
      case 'rotate': {
        let degrees = transform.data[0] % 360;
        if (degrees > 350) {
          degrees = exactAdd(degrees, -360);
        } else if (degrees <= -100) {
          degrees = exactAdd(degrees, 360);
        }
        if (
          transform.data.length > 1 &&
          transform.data[1] === 0 &&
          transform.data[2] === 0
        ) {
          return [degrees];
        }
        return [degrees, ...transform.data.slice(1)];
      }
      case 'scale':
        if (transform.data[0] === transform.data[1]) {
          return transform.data.slice(0, 1);
        }
        break;
      case 'translate':
        if (transform.data[1] === 0) {
          return transform.data.slice(0, 1);
        }
        break;
    }
    return transform.data;
  }

  const transformString = transformJS
    .map((transform) => {
      return `${transform.name}(${minifyData(transform)
        .map((n) => minifyNumber(n))
        .join(' ')})`;
    })
    .join('');

  return transformString;
}
