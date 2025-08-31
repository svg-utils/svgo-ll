import { AttValue } from './attvalue.js';
import { parseStyleDeclarations } from './css-tools.js';

const EMPTY_DECLARATIONS = new Map();

export class StyleAttValue extends AttValue {
  /** @type {import('./types.js').CSSDeclarationMap|undefined} */
  #declarations;

  /**
   * @param {string} str
   */
  constructor(str) {
    super(str);
    this.#declarations = parseStyleDeclarations(str);
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
   * @returns {MapIterator<[string, import('./types.js').CSSPropertyValue]>}
   */
  propertyIterator() {
    return this.#declarations
      ? this.#declarations.entries()
      : EMPTY_DECLARATIONS.entries();
  }
}
