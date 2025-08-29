import { ColorValue } from '../lib/color.js';
import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/svgo/tools.js';

export const name = 'minifyColors';
export const description =
  'minifies color values used in attributes and style properties';

/**
 * @type {import('./plugins-types.js').Plugin<'minifyColors'>};
 */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector()
  ) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        // Minify attribute values.
        for (const [attName, attVal] of Object.entries(element.attributes)) {
          switch (attName) {
            case 'color':
            case 'fill':
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
            case 'stroke':
              {
                const value = ColorValue.getColorObj(attVal);
                const min = value.getMinifiedValue();
                if (min) {
                  element.attributes[attName] = min;
                }
              }
              break;
          }
        }

        // Minify style properties.
        const props = getStyleDeclarations(element);
        if (!props) {
          return;
        }
        let propChanged = false;
        for (const [propName, propValue] of props.entries()) {
          switch (propName) {
            case 'color':
            case 'fill':
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
            case 'stroke':
              {
                const value = ColorValue.getColorObj(propValue.value);
                const min = value.getMinifiedValue();
                if (min) {
                  propChanged = true;
                  props.set(propName, {
                    value: min,
                    important: propValue.important,
                  });
                }
              }
              break;
          }
        }
        if (propChanged) {
          writeStyleAttribute(element, props);
        }
      },
    },
  };
};
