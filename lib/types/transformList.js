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
   * @returns {TransformList}
   */
  minify() {
    /** @type {import('../types-transform.js').TransformFn[]} */
    const minified = [];
    for (let index = 0; index < this.#transforms.length; index++) {
      const transform = this.#transforms[index];
      if (index === 0) {
        minified.push(transform);
        continue;
      }
      switch (transform.name) {
        case 'rotate':
          {
            // If last one was rotate, merge them.
            const last = minified[minified.length - 1];
            if (last.name === 'rotate') {
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
