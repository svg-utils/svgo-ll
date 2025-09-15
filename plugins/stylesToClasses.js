import { StyleAttValue } from '../lib/styleAttValue.js';
import { generateId, updateStyleAttribute } from '../lib/svgo/tools.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'stylesToClasses';
export const description =
  'convert attributes and inline styles to classes where shorter';

export class StyleToClassData {
  #props;
  #propString;
  /** @type {import('../lib/types.js').XastElement[]} */
  #elements;
  /** @type {string|undefined} */
  #className;

  /**
   * @param {Map<string,import('../lib/types.js').CSSPropertyValue>} props
   * @param {string} propString
   */
  constructor(props, propString) {
    this.#props = props;
    this.#propString = propString;
    this.#elements = [];
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
   */
  addElement(element) {
    this.#elements.push(element);
  }

  /**
   * @param {string} className
   * @returns {number}
   */
  calculateSavings(className) {
    // Style rule: "." + className + "{}" + propString
    let cost = 1 + className.length + 2 + this.#propString.length;
    let savings = 0;

    for (const element of this.#elements) {
      // Add class to element.
      cost += ' class=""'.length + className.length;

      // If there is a style attribute, see how much it is reduced.
      const styleAtt = StyleAttValue.getStyleAttValue(element);
      if (styleAtt) {
        const origSize = ' style=""'.length + styleAtt.toString().length;
        const newSize = 0;
        savings += origSize - newSize;
      }
    }
    return savings - cost;
  }

  /**
   * @returns {string|undefined}
   */
  getClassName() {
    return this.#className;
  }

  /**
   * @returns {import('../lib/types.js').XastElement[]}
   */
  getElements() {
    return this.#elements;
  }

  /**
   * @returns {Map<string,import('../lib/types.js').CSSPropertyValue>}
   */
  getProperties() {
    return this.#props;
  }

  /**
   * @param {string} className
   */
  setClassName(className) {
    this.#className = className;
  }
}

/** @type {import('./plugins-types.js').Plugin<'stylesToClasses'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector()
  ) {
    return;
  }

  /** @type {Map<string,StyleToClassData>} */
  const mapStylesToElems = new Map();

  return {
    element: {
      enter: (element) => {
        const props = getPresentationProperties(element);
        if (props.size === 0) {
          return;
        }

        const strVal = new StyleAttValue(props).toString();
        let info = mapStylesToElems.get(strVal);
        if (info === undefined) {
          info = new StyleToClassData(props, strVal);
          mapStylesToElems.set(strVal, info);
        }
        info.addElement(element);
      },
    },

    root: {
      exit: () => {
        let classNameCounter = 0;

        // First calculate savings.

        let totalSavings = styleData.hasStyles()
          ? 0
          : -'<style></style>'.length;
        let classId = generateId(classNameCounter++);
        for (const [str, info] of mapStylesToElems) {
          const savings = info.calculateSavings(classId);
          if (savings <= 0) {
            continue;
          }
          totalSavings += savings;
          info.setClassName(classId);
          classId = generateId(classNameCounter++);
        }

        if (totalSavings <= 0) {
          return;
        }

        const rules = [];
        for (const [str, info] of mapStylesToElems) {
          for (const element of info.getElements()) {
            const className = info.getClassName();
            if (className === undefined) {
              continue;
            }
            element.attributes['class'] = className;
            const origProps = StyleAttValue.getStyleAttValue(element);
            for (const propName of info.getProperties().keys()) {
              if (origProps) {
                origProps.delete(propName);
              }
              delete element.attributes[propName];
            }
            updateStyleAttribute(element, origProps);
          }
          rules.push(`.${info.getClassName()}{${str}}`);
        }

        if (rules.length === 0) {
          return;
        }

        styleData.addStyleSection(rules.join(''));
      },
    },
  };
};
