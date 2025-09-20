import { svgParseTransform, svgStringifyTransform } from '../svg-parse-att.js';
import { AttValue } from './attValue.js';

export class TransformValue extends AttValue {
  /** @type {import("../types-svg-attr.js").SVGTransformFn[]|undefined} */
  #transforms;

  /**
   *
   * @param {string|undefined} strVal
   * @param {import("../types-svg-attr.js").SVGTransformFn[]} [transforms]
   */
  constructor(strVal, transforms) {
    super(strVal);
    this.#transforms = transforms;
  }

  generateString() {
    if (!this.#transforms) {
      throw new Error();
    }
    return svgStringifyTransform(this.#transforms);
  }

  /**
   * @param {import('../types.js').SVGAttValue} value
   * @returns {TransformValue}
   */
  static getTransformObj(value) {
    if (typeof value === 'string') {
      return new TransformValue(value);
    }
    if (value instanceof TransformValue) {
      return value;
    }
    throw value;
  }

  /**
   * @returns {import("../types-svg-attr.js").SVGTransformFn[]}
   */
  getTransforms() {
    if (this.#transforms === undefined) {
      this.#transforms = svgParseTransform(this.toString());
    }
    return this.#transforms;
  }
}
