import { StyleAttValue } from '../lib/styleAttValue.js';
import { generateId, updateStyleAttribute } from '../lib/svgo/tools.js';
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

  /** @type {Map<string,{props:Map<string,import('../lib/types.js').CSSPropertyValue>,elements:import('../lib/types.js').XastElement[],className?:string}>} */
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
          info = { props: props, elements: [] };
          mapStylesToElems.set(strVal, info);
        }
        info.elements.push(element);
      },
    },

    root: {
      exit: () => {
        let classNameCounter = 0;

        // First calculate savings.

        let className = generateId(classNameCounter++);
        for (const [str, info] of mapStylesToElems) {
          info.className = className;
          className = generateId(classNameCounter++);
        }

        const rules = [];
        for (const [str, info] of mapStylesToElems) {
          for (const element of info.elements) {
            if (info.className === undefined) {
              continue;
            }
            element.attributes['class'] = info.className;
            const origProps = StyleAttValue.getStyleAttValue(element);
            for (const propName of info.props.keys()) {
              if (origProps) {
                origProps.delete(propName);
              }
              delete element.attributes[propName];
            }
            updateStyleAttribute(element, origProps);
          }
          rules.push(`.${info.className}{${str}}`);
        }

        if (rules.length === 0) {
          return;
        }

        styleData.addStyleSection(rules.join(''));
      },
    },
  };
};
