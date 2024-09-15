import { inheritableAttrs, pathElems } from './_collections.js';

export const name = 'moveElemsAttrsToGroup';
export const description =
  'Move common attributes of group children to the group';

/**
 * Move common attributes of group children to the group
 *
 * @example
 * <g attr1="val1">
 *     <g attr2="val2">
 *         text
 *     </g>
 *     <circle attr2="val2" attr3="val3"/>
 * </g>
 *              ⬇
 * <g attr1="val1" attr2="val2">
 *     <g>
 *         text
 *     </g>
 *    <circle attr3="val3"/>
 * </g>
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types.js').Plugin<'moveElemsAttrsToGroup'>}
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
      exit: (node, parentNode, parentInfo) => {
        // Process only groups with more than 1 child.
        if (node.name !== 'g' || node.children.length <= 1) {
          return;
        }

        /**
         * Find common attributes in group children.
         * @type {Map<string, string>}
         */
        const commonAttributes = new Map();
        let initial = true;
        let everyChildIsPath = true;
        for (const child of node.children) {
          if (child.type === 'element') {
            if (!pathElems.has(child.name)) {
              everyChildIsPath = false;
            }
            if (initial) {
              initial = false;
              // collect all inheritable attributes from first child element
              for (const [name, value] of Object.entries(child.attributes)) {
                // Consider only inheritable attributes and transform. Transform is not inheritable, but according
                // to https://developer.mozilla.org/docs/Web/SVG/Element/g, "Transformations applied to the
                // <g> element are performed on its child elements"
                if (inheritableAttrs.has(name) || name === 'transform') {
                  commonAttributes.set(name, value);
                }
              }
            } else {
              // exclude uncommon attributes from initial list
              for (const [name, value] of commonAttributes) {
                if (child.attributes[name] !== value) {
                  commonAttributes.delete(name);
                }
              }
            }
          }
        }

        // Preserve transform on children when group has filter or clip-path or mask.
        const computedStyles = styleData.computeStyle(node, parentInfo);
        if (
          computedStyles.has('clip-path') ||
          computedStyles.has('filter') ||
          computedStyles.has('mask')
        ) {
          commonAttributes.delete('transform');
        }

        // preserve transform when all children are paths
        // so the transform could be applied to path data by other plugins
        if (everyChildIsPath) {
          commonAttributes.delete('transform');
        }

        // add common children attributes to group
        for (const [name, value] of commonAttributes) {
          if (name === 'transform') {
            if (node.attributes.transform != null) {
              node.attributes.transform = `${node.attributes.transform} ${value}`;
            } else {
              node.attributes.transform = value;
            }
          } else {
            node.attributes[name] = value;
          }
        }

        // delete common attributes from children
        for (const child of node.children) {
          if (child.type === 'element') {
            for (const [name] of commonAttributes) {
              delete child.attributes[name];
            }
          }
        }
      },
    },
  };
};
