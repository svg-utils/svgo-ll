import { ColorAttValue } from '../lib/attrs/colorAttValue.js';
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
        if (element.uri !== undefined) {
          return;
        }

        // Minify attribute values.
        for (const [attName, attVal] of element.svgAtts.entries()) {
          switch (attName) {
            case 'fill':
            case 'stroke':
              {
                const value = PaintAttValue.getAttValue(element, attName);
                if (value) {
                  element.svgAtts.set(attName, value.getMinifiedValue());
                }
              }
              break;
            case 'color':
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
              {
                const value = ColorAttValue.getObj(attVal);
                element.svgAtts.set(attName, value.getMinifiedValue());
              }
              break;
          }
        }

        // Minify style properties.
        const styleAttValue = StyleAttValue.getAttValue(element);
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
                const value = ColorAttValue.getObj(propValue.value);
                styleAttValue.set(propName, {
                  value: value.getMinifiedValue(),
                  important: propValue.important,
                });
              }
              break;
          }
        }
      },
    },
  };
};
