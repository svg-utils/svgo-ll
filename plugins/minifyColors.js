import { ColorValue } from '../lib/attrs/colorValue.js';
import { PaintAttValue } from '../lib/attrs/paintAttValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';

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
            case 'fill':
            case 'stroke':
              {
                const value = PaintAttValue.getAttValue(element, attName);
                if (value) {
                  element.attributes[attName] = value.getMinifiedValue();
                }
              }
              break;
            case 'color':
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
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
        const styleAttValue = StyleAttValue.getStyleAttValue(element);
        if (!styleAttValue) {
          return;
        }
        for (const [propName, propValue] of styleAttValue.entries()) {
          switch (propName) {
            case 'fill':
            case 'stroke':
              {
                const value = PaintAttValue.getObj(propValue.value);
                styleAttValue.set(propName, {
                  value: value.getMinifiedValue(),
                  important: propValue.important,
                });
              }
              break;
            case 'color':
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
              {
                const value = ColorValue.getColorObj(propValue.value);
                const min = value.getMinifiedValue();
                if (min) {
                  styleAttValue.set(propName, {
                    value: min,
                    important: propValue.important,
                  });
                }
              }
              break;
          }
        }
      },
    },
  };
};
