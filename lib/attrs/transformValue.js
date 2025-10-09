import {
  svgParseTransform,
  svgStringifyTransform,
  svgStringifyTransformAsProperty,
} from '../svg-parse-att.js';
import { AttValue } from './attValue.js';

export class TransformValue extends AttValue {
  /** @type {import('../types-transform.js').TransformFn[]} */
  #transforms;

  /** @type {string|undefined} */
  #strValue;
  /** @type {string|undefined} */
  #strValueStyle;

  /**
   * @param {import('../types-transform.js').TransformFn[]} transforms
   */
  constructor(transforms) {
    super();
    this.#transforms = transforms;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {TransformValue|undefined}
   */
  static getAttValue(element, attName) {
    if (typeof element.attributes[attName] !== 'string') {
      // @ts-ignore
      return element.attributes[attName];
    }
    const value = this.getObj(element.attributes[attName]);
    element.attributes[attName] = value;
    return value;
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {TransformValue}
   */
  static getObj(value) {
    if (typeof value === 'string') {
      return new TransformValue(svgParseTransform(value));
    }
    // @ts-ignore
    return value;
  }

  /**
   * @returns {import('../types-transform.js').TransformFn[]}
   */
  getTransforms() {
    return this.#transforms;
  }

  /**
   * @param {import('../types.js').SVGAttValue} v1
   * @param {import('../types.js').SVGAttValue|undefined} v2
   * @returns {TransformValue}
   */
  static mergeTransforms(v1, v2) {
    const t1 = this.getObj(v1);
    if (v2 === undefined) {
      return t1;
    }
    const t2 = this.getObj(v2);
    return new TransformValue(t1.getTransforms().concat(t2.getTransforms()));
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
