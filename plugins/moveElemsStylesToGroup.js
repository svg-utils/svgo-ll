import { parseStyleDeclarations } from '../lib/css.js';
import { writeStyleAttribute } from '../lib/style.js';
import { inheritableAttrs } from './_collections.js';

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
        /** @type {Map<import('../lib/types.js').XastElement,Map<string,string>>} */
        const childProperties = new Map();

        /**
         * Find common properties in group children.
         * @type {Map<string, string>}
         */
        const commonProperties = new Map();
        let initial = true;
        for (const child of node.children) {
          if (child.type !== 'element') {
            continue;
          }

          const style = child.attributes.style;
          if (style === undefined) {
            return;
          }
          const properties = parseStyleDeclarations(style);
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
              if (properties.get(name) !== value) {
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
        const groupProperties = parseStyleDeclarations(node.attributes.style);

        for (const [name, value] of commonProperties) {
          groupProperties.set(name, value);
        }

        writeStyleAttribute(node, groupProperties);

        // Delete common properties from children.
        for (const child of node.children) {
          if (child.type === 'element') {
            /** @type {Map<string,string>} */
            // @ts-ignore
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
