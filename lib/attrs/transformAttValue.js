import {
  svgParseTransform,
  svgStringifyTransform,
  svgStringifyTransformAsProperty,
} from '../svg-parse-att.js';
import { AttValue } from './attValue.js';

export class TransformAttValue extends AttValue {
  /** @type {import('../types-transform.js').TransformFn[]} */
  #transforms;

  /** @type {string|undefined} */
  #strValue;
  /** @type {string|undefined} */
  #strValueStyle;

  /**
   * @param {string|import('../types-transform.js').TransformFn[]} value
   * @param {boolean} [isImportant=false]
   */
  constructor(value, isImportant = false) {
    super(undefined, isImportant);
    this.#transforms =
      typeof value === 'string' ? svgParseTransform(value) : value;
  }

  /**
   * @returns {import('../types-transform.js').TransformFn[]}
   */
  getTransforms() {
    return this.#transforms;
  }

  /**
   * @param {TransformAttValue} t2
   * @returns {TransformAttValue}
   */
  mergeTransforms(t2) {
    return new TransformAttValue(
      this.getTransforms().concat(t2.getTransforms()),
    );
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
