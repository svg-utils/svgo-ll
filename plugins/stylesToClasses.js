import { ClassAttValue } from '../lib/attrs/classAttValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { generateId } from '../lib/svgo/tools.js';
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
   * @param {import('../lib/types.js').SvgAttValues} props
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
      cost += element.svgAtts.get('class')
        ? className.length + 1
        : ' class=""'.length + className.length;

      // If there is a style attribute, see how much it is reduced.
      const styleAtt = StyleAttValue.getAttValue(element);
      if (styleAtt) {
        const origSize = ' style=""'.length + styleAtt.toString().length;
        const newSize = 0;
        savings += origSize - newSize;
      }

      // Remove attribute if present.
      for (const propName of this.#props.keys()) {
        const att = element.svgAtts.get(propName);
        if (att !== undefined) {
          savings += ' =""'.length + propName.length + att.toString().length;
        }
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
   * @returns {import('../lib/types.js').SvgAttValues}
   */
  getProperties() {
    return this.#props;
  }

  /**
   * @returns {string}
   */
  getPropertyString() {
    return this.#propString;
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
    !styleData.hasOnlyFeatures(['class-selectors'])
  ) {
    return;
  }

  /** @type {Map<string,StyleToClassData>} */
  const mapStylesToElems = new Map();

  const reservedClassNames = new Set();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        const cv = ClassAttValue.getAttValue(element);
        if (cv) {
          // Record existing class names.
          for (const className of cv.getClassNames()) {
            reservedClassNames.add(className);
          }
        }

        const props = getPresentationProperties(element);
        if (!props.hasAttributes()) {
          return;
        }

        const strVal = new StyleAttValue(props).getSortedString();
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
        /**
         * @param {import('../lib/types.js').StyleData} styleData
         * @returns {string}
         */
        function getNextId(styleData) {
          while (true) {
            const classId = generateId(classNameCounter++);
            if (styleData.hasClassReference(classId)) {
              continue;
            }
            if (reservedClassNames.has(classId)) {
              continue;
            }
            return classId;
          }
        }

        let classNameCounter = 0;

        // Sort values by number of references so most-used classes have the shortest class names.
        const sortedStyles = Array.from(mapStylesToElems.values()).sort(
          (a, b) => b.getElements().length - a.getElements().length,
        );

        // First calculate savings.
        let totalSavings = styleData.hasStyles()
          ? 0
          : -'<style></style>'.length;
        let classId = getNextId(styleData);
        for (const info of sortedStyles) {
          const savings = info.calculateSavings(classId);
          if (savings <= 0) {
            continue;
          }
          totalSavings += savings;
          info.setClassName(classId);
          classId = getNextId(styleData);
        }

        if (totalSavings <= 0) {
          return;
        }

        const rules = [];
        for (const info of sortedStyles) {
          const className = info.getClassName();
          if (className === undefined) {
            continue;
          }

          for (const element of info.getElements()) {
            let cv = ClassAttValue.getAttValue(element);
            if (cv === undefined) {
              cv = new ClassAttValue('');
            }
            cv.addClass(className);
            element.svgAtts.set('class', cv);

            const origProps = StyleAttValue.getAttValue(element);
            for (const propName of info.getProperties().keys()) {
              if (origProps) {
                origProps.delete(propName);
              }
              element.svgAtts.delete(propName);
            }
            if (origProps) {
              origProps.updateElement(element);
            }
          }
          rules.push(`.${info.getClassName()}{${info.getPropertyString()}}`);
        }

        if (rules.length === 0) {
          return;
        }

        styleData.addStyleSection(rules.join(''));
        styleData.mergeStyles();
      },
    },
  };
};
