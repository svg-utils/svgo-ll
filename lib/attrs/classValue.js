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
   * @returns {string[]}
   */
  getClassNames() {
    return this.#classes;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {ClassValue|undefined}
   */
  static getAttValue(element) {
    if (element.attributes.class === undefined) {
      return;
    }
    const cv = this.getObj(element.attributes.class);
    element.attributes.class = cv;
    return cv;
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

  /**
   * @param {string} oldName
   * @param {string} newName
   */
  rename(oldName, newName) {
    const index = this.#classes.indexOf(oldName);
    this.#classes[index] = newName;
  }

  toString() {
    return this.#classes.join(' ');
  }
}
