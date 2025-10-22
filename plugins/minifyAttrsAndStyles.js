import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'minifyAttrsAndStyles';
export const description =
  'use the shorter of attributes and styles in each element';

/** @type {import('./plugins-types.js').Plugin<'minifyAttrsAndStyles'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        const props = getPresentationProperties(element);
        if (props.count() === 0) {
          return;
        }

        if (getAttrWidth(props) < getStyleWidth(props)) {
          // Attributes are shorter; remove the style attribute and use individual attributes.

          for (const [name, value] of props.entries()) {
            element.svgAtts.set(name, value);
          }

          element.svgAtts.delete('style');
        } else {
          // Style is at least as short; remove the individual attributes and convert to style properties.
          for (const name of props.keys()) {
            element.svgAtts.delete(name);
          }
          new StyleAttValue(props).updateElement(element);
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').SvgAttValues} props
 * @returns {number}
 */
function getAttrWidth(props) {
  let width = 0;
  for (const [name, value] of props.entries()) {
    width += ' =""'.length + name.length + value.toString().length;
  }
  return width;
}

/**
 * @param {import('../lib/types.js').SvgAttValues} props
 * @returns {number}
 */
function getStyleWidth(props) {
  const att = new StyleAttValue(props);
  return ' style=""'.length + att.toString().length;
}
