import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';
import { inheritableAttrs } from './_collections.js';

/**
 * @typedef {import('../lib/types.js').CSSDeclarationMap} CSSDeclarationMap
 */

export const name = 'moveElemsStylesToGroup';
export const description =
  'Move common style properties of group children to the group.';

/**
 * @type {import('./plugins-types.js').Plugin<'moveElemsStylesToGroup'>}
 */
export const fn = (root, params, info) => {
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
      exit: (node) => {
        // Process only groups with more than 1 child.
        if (node.name !== 'g' || node.children.length <= 1) {
          return;
        }

        // Record child properties so we don't have to re-parse them.
        /** @type {Map<import('../lib/types.js').XastElement,Map<string,{value:string,important?:boolean}>>} */
        const childProperties = new Map();

        /**
         * Find common properties in group children.
         * @type {CSSDeclarationMap}
         */
        const commonProperties = new Map();
        let initial = true;
        for (const child of node.children) {
          if (child.type !== 'element') {
            continue;
          }

          const properties = getStyleDeclarations(child);
          if (properties === undefined) {
            return;
          }
          childProperties.set(child, properties);

          if (initial) {
            initial = false;
            // Collect all inheritable properties from first child element.
            for (const [name, value] of properties.entries()) {
              // Consider only inheritable attributes and transform. Transform is not inheritable, but according
              // to https://developer.mozilla.org/docs/Web/SVG/Element/g, "Transformations applied to the
              // <g> element are performed on its child elements"
              if (inheritableAttrs.has(name) || name === 'transform') {
                commonProperties.set(name, value);
              }
            }
          } else {
            // exclude uncommon attributes from initial list
            for (const [name, value] of commonProperties) {
              const dec = properties.get(name);
              if (
                !dec ||
                dec.value !== value.value ||
                dec.important !== value.important
              ) {
                commonProperties.delete(name);
              }
            }
          }

          if (commonProperties.size === 0) {
            return;
          }
        }

        // Preserve transform on children when group has filter or clip-path or mask.
        const groupOwnStyle = styleData.computeOwnStyle(node);
        if (
          groupOwnStyle.has('clip-path') ||
          groupOwnStyle.has('filter') ||
          groupOwnStyle.has('mask')
        ) {
          commonProperties.delete('transform');
        }

        // Add common child properties to group.
        /** @type {CSSDeclarationMap} */
        const groupProperties = getStyleDeclarations(node) ?? new Map();

        for (const [name, value] of commonProperties) {
          groupProperties.set(name, value);
        }

        writeStyleAttribute(node, groupProperties);

        // Delete common properties from children.
        for (const child of node.children) {
          if (child.type === 'element') {
            /** @type {CSSDeclarationMap} */
            // @ts-ignore - properties should be defined because
            const properties = childProperties.get(child);
            for (const [name] of commonProperties) {
              properties.delete(name);
            }
            writeStyleAttribute(child, properties);
          }
        }
      },
    },
  };
};
