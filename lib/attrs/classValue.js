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
   * @returns {ClassValue|undefined}
   */
  static getAttValue(element) {
    /** @type {string|ClassValue|undefined} */
    let value = element.svgAtts.get('class');
    if (typeof value === 'string') {
      value = new ClassValue(value);
      element.svgAtts.set('class', value);
    }
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
