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
            case 'color':
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
              element.svgAtts.set(attName, attVal.getMinifiedValue());
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
            case 'color':
            case 'flood-color':
            case 'lighting-color':
            case 'stop-color':
              styleAttValue.set(propName, propValue.getMinifiedValue());
              break;
          }
        }
      },
    },
  };
};
