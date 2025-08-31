import { AttValue } from './attvalue.js';
import { parseStyleDeclarations } from './css-tools.js';

const EMPTY_DECLARATIONS = new Map();

export class StyleAttValue extends AttValue {
  /** @type {Map<string,import('./types.js').CSSPropertyValue>|undefined} */
  #declarations;
  /** @type {string|undefined} */
  #stringVal;

  /**
   * @param {string|Map<string,import('./types.js').CSSPropertyValue>} [properties]
   */
  constructor(properties) {
    super(undefined);
    switch (typeof properties) {
      case 'string':
        this.#declarations = parseStyleDeclarations(properties);
        break;
      case 'undefined':
        break;
      default:
        this.#declarations = properties;
        break;
    }
  }

  /**
   * @param {string} name
   */
  delete(name) {
    if (this.#declarations) {
      this.#declarations.delete(name);
    }
    this.#stringVal = undefined;
  }

  /**
   * @returns {IterableIterator<[string, import('./types.js').CSSPropertyValue]>}
   */
  entries() {
    return this.#declarations
      ? this.#declarations.entries()
      : EMPTY_DECLARATIONS.entries();
  }

  /**
   * @param {string} name
   * @returns {import('./types.js').CSSPropertyValue|undefined}
   */
  get(name) {
    return this.#declarations ? this.#declarations.get(name) : undefined;
  }

  /**
   * @param {import('./types.js').XastElement} element
   * @returns {StyleAttValue|undefined}
   */
  static getStyleAttValue(element) {
    const style = element.attributes.style;
    if (style === undefined) {
      return;
    }
    if (typeof style === 'string') {
      const attValue = new StyleAttValue(style);
      if (attValue.isEmpty()) {
        delete element.attributes.style;
        return;
      } else {
        element.attributes.style = attValue;
        return attValue;
      }
    }
    // @ts-ignore - style is not a string or undefined, it should be StyleAttValue
    return style;
  }

  /**
   * @returns {boolean}
   */
  isEmpty() {
    return this.#declarations === undefined || this.#declarations.size === 0;
  }

  /**
   * @returns {IterableIterator<string>}
   */
  keys() {
    return this.#declarations
      ? this.#declarations.keys()
      : EMPTY_DECLARATIONS.keys();
  }

  /**
   * @param {string} name
   * @deprecated - use delete()
   */
  removeProperty(name) {
    this.delete(name);
  }

  /**
   * @param {string} name
   * @param {import('./types.js').CSSPropertyValue} value
   */
  set(name, value) {
    if (this.#declarations === undefined) {
      this.#declarations = new Map();
    }
    this.#declarations.set(name, value);
    this.#stringVal = undefined;
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#declarations === undefined) {
      return '';
    }
    if (this.#stringVal === undefined) {
      let style = '';
      for (const [p, decValue] of this.#declarations.entries()) {
        if (style !== '') {
          style += ';';
        }
        style += `${p}:${decValue.value}`;
        if (decValue.important) {
          style += '!important';
        }
      }
      this.#stringVal = style;
    }
    return this.#stringVal;
  }

  /**
   * @returns {IterableIterator<import('./types.js').CSSPropertyValue>}
   */
  values() {
    return this.#declarations
      ? this.#declarations.values()
      : EMPTY_DECLARATIONS.values();
  }
}
