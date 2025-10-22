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
   * @param {import('../types-transform.js').TransTypeAngle} angle
   * @returns {import('../types-transform.js').TransformFnRotate}
   */
  static createFnRotate(angle) {
    return {
      name: 'rotate',
      a: angle,
      tx: { n: ExactNum.zero(), unit: 'px' },
      ty: { n: ExactNum.zero(), unit: 'px' },
    };
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
  minify() {
    /** @type {import('../types-transform.js').TransformFn[]} */
    const minified = [];
    for (let index = 0; index < this.#transforms.length; index++) {
      const transform = this.#transforms[index];
      if (isIdentityTransform(transform)) {
        continue;
      }
      if (minified.length === 0) {
        minified.push(transform);
        continue;
      }
      switch (transform.name) {
        case 'rotate':
          {
            // If last one was rotate, merge them.
            const last = minified[minified.length - 1];
            if (last.name === 'rotate' && canMergeRotates(last, transform)) {
              const angle = last.a.n.add(transform.a.n);
              if (angle) {
                minified[minified.length - 1] = TransformList.createFnRotate({
                  n: angle,
                  unit: last.a.unit,
                });
                continue;
              }
            }
          }
          break;
        case 'translate':
          {
            // If last one was translate, merge them.
            const last = minified[minified.length - 1];
            if (
              last.name === 'translate' &&
              canMergeTranslates(last, transform)
            ) {
              const x = last.x.n.add(transform.x.n);
              const y = last.y.n.add(transform.y.n);
              if (x && y) {
                minified[minified.length - 1] = {
                  name: 'translate',
                  x: { n: x, unit: last.x.unit },
                  y: { n: y, unit: last.y.unit },
                };
                continue;
              }
            }
          }
          break;
      }

      minified.push(transform);
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
 * @param {import('../types-transform.js').TransformFnRotate} r1
 * @param {import('../types-transform.js').TransformFnRotate} r2
 * @returns {boolean}
 */
function canMergeRotates(r1, r2) {
  if (
    !r1.tx.n.isZero() ||
    !r1.ty.n.isZero() ||
    !r2.tx.n.isZero() ||
    !r2.ty.n.isZero()
  ) {
    return false;
  }
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
 * @param {import('../types-transform.js').TransformFn} t
 * @returns {boolean}
 */
function isIdentityTransform(t) {
  switch (t.name) {
    case 'rotate':
      return t.a.n.isZero();
  }
  return false;
}
