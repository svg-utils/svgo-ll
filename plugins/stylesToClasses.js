import { StyleAttValue } from '../lib/styleAttValue.js';
import { generateId } from '../lib/svgo/tools.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'stylesToClasses';
export const description =
  'convert attributes and inline styles to classes where shorter';

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

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const mapStylesToElems = new Map();

  return {
    element: {
      enter: (element) => {
        const props = getPresentationProperties(element);
        if (props.size === 0) {
          return;
        }

        const strVal = new StyleAttValue(props).toString();
        let elements = mapStylesToElems.get(strVal);
        if (elements === undefined) {
          elements = [];
          mapStylesToElems.set(strVal, elements);
        }
        elements.push(element);
      },
    },

    root: {
      exit: () => {
        let classNameCounter = 0;
        const rules = [];
        for (const [str, elements] of mapStylesToElems) {
          if (elements.length < 2) {
            continue;
          }

          const className = generateId(classNameCounter++);
          rules.push(`.${className}{${str}}`);
        }

        if (rules.length === 0) {
          return;
        }

        styleData.addStyleSection(rules.join(''));
      },
    },
  };
};
