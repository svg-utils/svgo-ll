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
   */
  constructor(value) {
    super();
    this.#transforms =
      typeof value === 'string' ? svgParseTransform(value) : value;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {TransformAttValue|undefined}
   */
  static getAttValue(element, attName) {
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new TransformAttValue(value),
    );
  }

  /**
   * @template {import('../types.js').AttValue} T
   * @param {string|T} value
   * @returns {TransformAttValue}
   * @deprecated
   */
  static createTransform(value) {
    // @ts-ignore
    return typeof value === 'string' ? new TransformAttValue(value) : value;
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
