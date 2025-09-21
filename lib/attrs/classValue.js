import { AttValue } from './attValue.js';

export class ClassValue extends AttValue {
  #classes;

  /**
   * @param {string} str
   */
  constructor(str) {
    super();
    this.#classes = str === '' ? [] : str.split(/\s/);
  }

  /**
   * @param {string} name
   */
  addClass(name) {
    this.#classes.push(name);
  }

  /**
   * @param {string|AttValue} value
   * @returns {ClassValue}
   */
  static getObj(value) {
    if (typeof value !== 'object') {
      return new ClassValue(value ?? '');
    }
    // @ts-ignore
    return value;
  }

  toString() {
    return this.#classes.join(' ');
  }
}
