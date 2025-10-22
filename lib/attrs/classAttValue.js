import { AttValue } from './attValue.js';

export class ClassAttValue extends AttValue {
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
   * @param {string} className
   */
  delete(className) {
    this.#classes = this.#classes.filter((n) => n !== className);
  }

  /**
   * @returns {string[]}
   */
  getClassNames() {
    return this.#classes;
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {ClassAttValue|undefined}
   */
  static getAttValue(element) {
    return this.getAttValueGeneric(
      element,
      'class',
      (value) => new ClassAttValue(value),
    );
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
