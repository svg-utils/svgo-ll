import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { TransformValue } from '../lib/attrs/transformValue.js';
import { updateStyleAttribute } from '../lib/svgo/tools-svg.js';
import { getInheritableProperties, TRANSFORM_PROP_NAMES } from './_styles.js';

export const name = 'moveElemsStylesToGroup';
export const description =
  'Move common style properties of group children to the group.';

/**
 * @type {import('./plugins-types.js').Plugin<'moveElemsStylesToGroup'>}
 */
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
      exit: (element) => {
        // Run on exit so children are processed first.

        // Process only groups with more than 1 child.
        if (
          element.uri !== undefined ||
          element.local !== 'g' ||
          element.children.length <= 1
        ) {
          return;
        }

        /**
         * Find common properties in group children.
         * @type {Map<string,import('../lib/types.js').CSSPropertyValue>}
         */
        const commonProperties = new Map();
        /** @type {Set<string>} */
        const transformPropertiesFound = new Set();
        let initial = true;

        for (const child of element.children) {
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
                childProperty.value.toString() !==
                  commonValue.value.toString() ||
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

        const groupOwnStyle = styleData.computeOwnStyle(element);

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
        const groupProperties = getInheritableProperties(element);

        const groupTransform = groupProperties.get('transform');
        const childTransform = commonProperties.get('transform');

        if (groupTransform && childTransform) {
          // We need to merge the two transforms rather than overwriting.
          const mergedTransform = TransformValue.getObj(
            groupTransform.value.toString() + childTransform.value.toString(),
          );
          commonProperties.set('transform', {
            value: mergedTransform,
            important: false,
          });
        }

        for (const [name, value] of commonProperties) {
          groupProperties.set(name, value);
        }

        let groupStyleAttValue =
          StyleAttValue.getStyleAttValue(element) || new StyleAttValue('');
        for (const [name, value] of groupProperties.entries()) {
          groupStyleAttValue.set(name, value);
          delete element.attributes[name];
        }
        updateStyleAttribute(element, groupStyleAttValue);

        // Delete common properties from children.
        for (const child of element.children) {
          if (child.type === 'element') {
            const childStyleAttValue = StyleAttValue.getStyleAttValue(child);
            for (const [name] of commonProperties) {
              if (childStyleAttValue) {
                childStyleAttValue.delete(name);
              }
              delete child.attributes[name];
            }
            updateStyleAttribute(child, childStyleAttValue);
          }
        }
      },
    },
  };
};
