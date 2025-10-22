import { TransformList } from '../types/transformList.js';
import { AttValue } from './attValue.js';

export class TransformAttValue extends AttValue {
  #transform;

  /**
   * @param {string|import('../types-transform.js').TransformFn[]} value
   * @param {boolean} [isImportant=false]
   */
  constructor(value, isImportant = false) {
    super(undefined, isImportant);
    this.#transform = new TransformList(value);
  }

  /**
   * @returns {import('../types-transform.js').TransformFn[]}
   */
  getTransforms() {
    return this.#transform.getTransforms();
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

  /**
   * @returns {TransformAttValue}
   */
  minify() {
    return this;
  }

  toString() {
    return this.#transform.toString();
  }

  toStyleAttString() {
    return this.#transform.toStyleAttString();
  }
}
