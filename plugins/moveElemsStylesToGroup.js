import { cssPropToString, getStyleDeclarations } from '../lib/css-tools.js';
import { cssTransformToSVGAtt } from '../lib/svg-to-css.js';
import { writeStyleAttribute } from '../lib/svgo/tools.js';
import { getInheritableProperties, TRANSFORM_PROP_NAMES } from './_styles.js';

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
        // Run on exit so children are processed first.

        // Process only groups with more than 1 child.
        if (node.name !== 'g' || node.children.length <= 1) {
          return;
        }

        /**
         * Find common properties in group children.
         * @type {import('../lib/types.js').CSSDeclarationMap}
         */
        const commonProperties = new Map();
        /** @type {Set<string>} */
        const transformPropertiesFound = new Set();
        let initial = true;

        for (const child of node.children) {
          if (child.type !== 'element') {
            continue;
          }

          const childProperties = getInheritableProperties(child);
          if (childProperties === undefined) {
            return;
          }

          if (initial) {
            initial = false;
            // Collect all inheritable properties from first child element.
            for (const [name, value] of childProperties.entries()) {
              commonProperties.set(name, value);
            }
          } else {
            // exclude uncommon attributes from initial list
            for (const [name, commonValue] of commonProperties) {
              const childProperty = childProperties.get(name);
              if (
                !childProperty ||
                cssPropToString(childProperty) !==
                  cssPropToString(commonValue) ||
                childProperty.important !== commonValue.important
              ) {
                commonProperties.delete(name);
              }
            }
          }

          // Record any transform properties found.
          TRANSFORM_PROP_NAMES.forEach((name) => {
            if (childProperties.has(name)) {
              transformPropertiesFound.add(name);
            }
          });

          if (commonProperties.size === 0) {
            return;
          }
        }

        const groupOwnStyle = styleData.computeOwnStyle(node);

        // Don't move transform on children when group has filter or clip-path or mask, or if not all transform properties can
        // be moved.
        let hasAllTransforms = true;
        transformPropertiesFound.forEach((name) => {
          if (!commonProperties.has(name)) {
            hasAllTransforms = false;
          }
        });
        if (
          groupOwnStyle.has('clip-path') ||
          groupOwnStyle.has('filter') ||
          groupOwnStyle.has('mask') ||
          !hasAllTransforms
        ) {
          TRANSFORM_PROP_NAMES.forEach((name) => commonProperties.delete(name));
        }

        // Add common child properties to group.
        /** @type {import('../lib/types.js').CSSDeclarationMap} */
        const groupProperties = getStyleDeclarations(node) ?? new Map();

        for (const [name, value] of commonProperties) {
          groupProperties.set(name, value);
        }

        const cssTransform = groupProperties.get('transform');
        if (cssTransform) {
          // Make sure we can translate it to an attribute.
          const attTransform = cssTransformToSVGAtt(cssTransform);
          if (attTransform) {
            // Add transform as an attribute.
            groupProperties.delete('transform');
            const currentTransform = node.attributes.transform ?? '';
            node.attributes.transform =
              currentTransform + attTransform.toString();
          } else {
            // This shouldn't happen unless there's a CSS transform which can't be converted to an attribute; don't
            // move the property.
            groupProperties.delete('transform');
          }
        }

        writeStyleAttribute(node, groupProperties);

        // Delete common properties from children.
        for (const child of node.children) {
          if (child.type === 'element') {
            const childProperties = getStyleDeclarations(child);
            for (const [name] of commonProperties) {
              if (childProperties) {
                childProperties.delete(name);
              }
              delete child.attributes[name];
            }
            if (childProperties) {
              writeStyleAttribute(child, childProperties);
            }
          }
        }
      },
    },
  };
};
