import { parseStyleDeclarations } from '../css-tools.js';
import { isDigit } from '../svgo/utils.js';
import { AttValue } from './attValue.js';

const MARKER_PROPERTIES = ['marker-start', 'marker-mid', 'marker-end'];
const EMPTY_DECLARATIONS = new Map();

export class StyleAttValue extends AttValue {
  /** @type {Map<string,import('../types.js').CSSPropertyValue>} */
  #declarations;

  /** @type {string|undefined} */
  #stringVal;
  /** @type {Map<string,import('../types.js').CSSPropertyValue>|undefined} */
  #minifiedDeclarations;

  /**
   * @param {string|Map<string,import('../types.js').CSSPropertyValue>} properties
   */
  constructor(properties) {
    super();
    switch (typeof properties) {
      case 'string':
        this.#declarations = parseStyleDeclarations(properties);
        break;
      default:
        this.#declarations = properties;
        break;
    }
  }

  #clearCache() {
    this.#stringVal = undefined;
    this.#minifiedDeclarations = undefined;
  }

  /**
   * @param {string} name
   */
  delete(name) {
    if (this.#declarations) {
      this.#declarations.delete(name);
    }
    this.#clearCache();
  }

  /**
   * @returns {IterableIterator<[string, import('../types.js').CSSPropertyValue]>}
   */
  entries() {
    return this.#declarations
      ? this.#declarations.entries()
      : EMPTY_DECLARATIONS.entries();
  }

  /**
   * @param {string} name
   * @returns {import('../types.js').CSSPropertyValue|undefined}
   */
  get(name) {
    return this.#declarations ? this.#declarations.get(name) : undefined;
  }

  /**
   * @returns {Map<string,import('../types.js').CSSPropertyValue>}
   */
  #getMinifiedDeclarations() {
    if (this.#minifiedDeclarations === undefined) {
      if (
        MARKER_PROPERTIES.every((name) => this.#declarations.has(name)) &&
        ['marker-mid', 'marker-end'].every((name) => {
          const start = this.get('marker-start');
          const other = this.get(name);
          return (
            start !== undefined &&
            other !== undefined &&
            start.value.toString() === other.value.toString() &&
            start.important === other.important
          );
        })
      ) {
        const m = new Map();
        this.#declarations.forEach((value, key) => {
          if (!MARKER_PROPERTIES.includes(key)) {
            m.set(key, value);
          }
        });
        m.set('marker', this.#declarations.get('marker-start'));
        this.#minifiedDeclarations = m;
      } else {
        this.#minifiedDeclarations = this.#declarations;
      }
    }
    return this.#minifiedDeclarations;
  }

  /**
   * @param {Iterable<[string,import('../types.js').CSSPropertyValue]>} iterator
   * @param {boolean} isAttribute
   * @returns {string}
   */
  static #getPropertyString(iterator, isAttribute) {
    let style = '';
    for (const [p, decValue] of iterator) {
      if (style !== '') {
        style += ';';
      }
      style += `${p}:${decValue.value}`;
      if (!isAttribute) {
        // If not for a style attribute, some properties need explicit "px" units.
        switch (p) {
          case 'font-size':
          case 'letter-spacing':
            if (isDigit(style[style.length - 1])) {
              style += 'px';
            }
            break;
        }
      }
      if (decValue.important) {
        style += '!important';
      }
    }
    return style;
  }

  /**
   * @returns {string}
   */
  getSortedString() {
    const sortedProps = Array.from(
      this.#getMinifiedDeclarations().entries(),
    ).sort((a, b) => a[0].localeCompare(b[0]));
    return StyleAttValue.#getPropertyString(sortedProps, false);
  }

  /**
   * @param {import('../types.js').XastElement} element
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
   * @param {import('../types.js').CSSPropertyValue} value
   */
  set(name, value) {
    if (this.#declarations === undefined) {
      this.#declarations = new Map();
    }
    this.#declarations.set(name, value);
    this.#clearCache();
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#declarations === undefined) {
      return '';
    }
    if (this.#stringVal === undefined) {
      this.#stringVal = StyleAttValue.#getPropertyString(
        this.#getMinifiedDeclarations().entries(),
        true,
      );
    }
    return this.#stringVal;
  }

  /**
   * @returns {IterableIterator<import('../types.js').CSSPropertyValue>}
   */
  values() {
    return this.#declarations
      ? this.#declarations.values()
      : EMPTY_DECLARATIONS.values();
  }
}
