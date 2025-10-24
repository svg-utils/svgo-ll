import { TransformList } from '../types/transformList.js';
import { AttValue } from './attValue.js';

export class TransformAttValue extends AttValue {
  #transform;

  /**
   * @param {string|TransformList} value
   * @param {boolean} [isImportant=false]
   */
  constructor(value, isImportant = false) {
    super(undefined, isImportant);
    this.#transform =
      typeof value === 'string' ? new TransformList(value) : value;
  }

  findShortestAttribute() {
    return new TransformAttValue(this.#transform.findShortestAttribute());
  }

  findShortestProperty() {
    return new TransformAttValue(this.#transform.findShortestProperty());
  }

  /**
   * @returns {import('../types-transform.js').TransformFn[]}
   */
  getTransforms() {
    return this.#transform.getTransforms();
  }

  isIdentityTransform() {
    return this.#transform.isIdentityTransform();
  }

  /**
   * @param {TransformAttValue} t2
   * @returns {TransformAttValue}
   */
  mergeTransforms(t2) {
    const array = this.getTransforms().concat(t2.getTransforms());
    return new TransformAttValue(new TransformList(array).normalize());
  }

  /**
   * @returns {TransformAttValue}
   */
  normalize() {
    return new TransformAttValue(this.#transform.normalize());
  }

  toString() {
    return this.#transform.toString();
  }

  toStyleAttString() {
    return this.#transform.toStyleAttString();
  }
}
