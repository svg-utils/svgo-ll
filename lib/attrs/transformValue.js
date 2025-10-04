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
