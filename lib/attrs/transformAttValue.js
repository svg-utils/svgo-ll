import { TransformList } from '../types/transformList.js';
import { AttValue } from './attValue.js';

export class TransformAttValue extends AttValue {
  #transform;

  /**
   * @param {string|TransformList} value
   * @param {boolean} [isImportant=false]
   * @param {function(string):import('../types-transform.js').TransformFn[]} [parser]
   */
  constructor(value, isImportant = false, parser) {
    super(typeof value === 'string' ? value : undefined, isImportant);
    if (!this.isGlobalKeyword()) {
      if (typeof value === 'string') {
        if (!/^\s*none\s*$/i.test(value)) {
          this.#transform = new TransformList(parser ? parser(value) : value);
        }
      } else {
        this.#transform = value;
      }
    }
  }

  canBeAttribute() {
    return this.#transform === undefined || this.#transform.canBeAttribute();
  }

  findShortestAttribute() {
    return this.#transform
      ? new TransformAttValue(this.#transform.findShortestAttribute())
      : this;
  }

  findShortestProperty() {
    return this.#transform
      ? new TransformAttValue(this.#transform.findShortestProperty())
      : this;
  }

  /**
   * @returns {import('../types-transform.js').TransformFn[]|undefined}
   */
  getTransforms() {
    return this.#transform?.getTransforms();
  }

  /**
   * @returns {boolean}
   */
  isIdentityTransform() {
    return (
      this.#transform !== undefined && this.#transform.isIdentityTransform()
    );
  }

  /**
   * @param {TransformAttValue} t2
   * @returns {TransformAttValue}
   */
  mergeTransforms(t2) {
    const t1Trans = this.getTransforms();
    const t2trans = t2.getTransforms();
    if (t1Trans === undefined || t2trans === undefined) {
      throw new Error();
    }
    const array = t1Trans.concat(t2trans);
    return new TransformAttValue(new TransformList(array).normalize());
  }

  /**
   * @returns {TransformAttValue}
   */
  normalize() {
    return this.#transform
      ? new TransformAttValue(this.#transform.normalize())
      : this;
  }

  toString() {
    if (this.isGlobalKeyword()) {
      return super.toString();
    }
    return this.#transform ? this.#transform.toString() : 'none';
  }

  toStyleAttString() {
    if (this.isGlobalKeyword()) {
      return super.toString();
    }
    return this.#transform ? this.#transform.toStyleAttString() : 'none';
  }
}
