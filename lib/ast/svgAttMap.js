export class SvgAttMap {
  /** @type {Map<string,import('../types.js').AttValue>} */
  #atts = new Map();

  /**
   * @param {string} local
   */
  delete(local) {
    this.#atts.delete(local);
  }

  /**
   * @returns {IterableIterator<[string,import('../types.js').AttValue]>}
   */
  entries() {
    return this.#atts.entries();
  }

  /**
   * @template {import('../types.js').AttValue} T
   * @param {string} local
   * @returns {T|undefined}
   */
  get(local) {
    // @ts-ignore
    return this.#atts.get(local);
  }

  /**
   * @template {import('../types.js').AttValue} T
   * @param {string} local
   * @returns {T}
   */
  getAtt(local) {
    // @ts-ignore
    return this.#atts.get(local);
  }

  /**
   * @returns {boolean}
   */
  hasAttributes() {
    return this.#atts.size > 0;
  }

  /**
   * @returns {IterableIterator<string>}
   */
  keys() {
    return this.#atts.keys();
  }

  /**
   * @param {string} local
   * @param {import('../types.js').AttValue} value
   */
  set(local, value) {
    this.#atts.set(local, value);
  }

  /**
   * @returns {IterableIterator<import('../types.js').AttValue>}
   */
  values() {
    return this.#atts.values();
  }
}
