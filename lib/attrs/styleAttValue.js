import {
  hasMarkerProperties,
  MARKER_PROP_NAMES,
  parseStyleDeclarations,
} from '../css-tools.js';
import { isDigit } from '../svgo/utils.js';
import { AttValue } from './attValue.js';

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
    this.#declarations.delete(name);
    this.#clearCache();
  }

  /**
   *
   * @param {import('../types.js').XastElement} element
   * @param {IterableIterator<string>} propNames
   */
  static deleteProps(element, propNames) {
    const attValue = this.getAttValue(element);
    if (attValue === undefined) {
      return;
    }
    for (const propName of propNames) {
      attValue.delete(propName);
    }
    attValue.updateElement(element);
  }

  /**
   * @returns {IterableIterator<[string, import('../types.js').CSSPropertyValue]>}
   */
  entries() {
    return this.#declarations.entries();
  }

  /**
   * @param {string} name
   * @returns {import('../types.js').CSSPropertyValue|undefined}
   */
  get(name) {
    return this.#declarations.get(name);
  }

  /**
   * @returns {Map<string,import('../types.js').CSSPropertyValue>}
   */
  #getMinifiedDeclarations() {
    if (this.#minifiedDeclarations === undefined) {
      if (hasMarkerProperties(this.#declarations)) {
        const m = new Map();
        this.#declarations.forEach((value, key) => {
          if (!MARKER_PROP_NAMES.includes(key)) {
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
   * @param {import('../types.js').XastElement} element
   * @returns {StyleAttValue|undefined}
   */
  static getAttValue(element) {
    const style = element.svgAtts.get('style');
    if (style === undefined) {
      return;
    }
    if (typeof style === 'string') {
      const attValue = new StyleAttValue(style);
      if (attValue.isEmpty()) {
        element.svgAtts.delete('style');
        return;
      } else {
        element.svgAtts.set('style', attValue);
        return attValue;
      }
    }
    // @ts-ignore - style is not a string or undefined, it should be StyleAttValue
    return style;
  }

  /**
   * @param {Iterable<[string,import('../types.js').CSSPropertyValue]>} iterator
   * @param {boolean} [isAttribute]
   * @returns {string}
   */
  static getPropertyString(iterator, isAttribute = true) {
    let style = '';
    for (const [p, decValue] of iterator) {
      if (style !== '') {
        style += ';';
      }
      style += `${p}:${typeof decValue.value === 'string' ? decValue.value : decValue.value.toStyleAttString()}`;
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
    return StyleAttValue.getPropertyString(sortedProps, false);
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {StyleAttValue|undefined}
   * @deprecated use getAttValue()
   */
  static getStyleAttValue(element) {
    return this.getAttValue(element);
  }

  /**
   * @returns {boolean}
   */
  isEmpty() {
    return this.#declarations.size === 0;
  }

  /**
   * @returns {IterableIterator<string>}
   */
  keys() {
    return this.#declarations.keys();
  }

  /**
   * @param {string} name
   * @param {import('../types.js').CSSPropertyValue} value
   */
  set(name, value) {
    this.#declarations.set(name, value);
    this.#clearCache();
  }

  /**
   * @returns {string}
   */
  toString() {
    if (this.#stringVal === undefined) {
      this.#stringVal = StyleAttValue.getPropertyString(
        this.#getMinifiedDeclarations().entries(),
        true,
      );
    }
    return this.#stringVal;
  }

  /**
   * @param {import('../types.js').XastElement} element
   */
  updateElement(element) {
    if (this.isEmpty()) {
      element.svgAtts.delete('style');
    } else {
      element.svgAtts.set('style', this);
    }
  }

  /**
   * @returns {IterableIterator<import('../types.js').CSSPropertyValue>}
   */
  values() {
    return this.#declarations.values();
  }
}
