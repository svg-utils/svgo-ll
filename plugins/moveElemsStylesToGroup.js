import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
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
         */
        const commonProperties = new SvgAttMap();
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
            for (const [name, commonValue] of commonProperties.entries()) {
              const childProperty = childProperties.get(name);
              if (
                !childProperty ||
                childProperty.toString() !== commonValue.toString() ||
                childProperty.isImportant() !== commonValue.isImportant()
              ) {
                commonProperties.delete(name);
              }
            }
          }

          // Record any transform properties found.
          TRANSFORM_PROP_NAMES.forEach((name) => {
            if (childProperties.get(name)) {
              transformPropertiesFound.add(name);
            }
          });

          if (commonProperties.count() === 0) {
            return;
          }
        }

        const groupOwnStyle = styleData.computeOwnStyle(element);

        // Don't move transform on children when group has filter or clip-path or mask, or if not all transform properties can
        // be moved.
        let hasAllTransforms = true;
        transformPropertiesFound.forEach((name) => {
          if (!commonProperties.get(name)) {
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

        /** @type {import('../types/types.js').TransformAttValue} */
        const groupTransform = groupProperties.getAtt('transform');
        /** @type {import('../types/types.js').TransformAttValue} */
        const childTransform = commonProperties.getAtt('transform');

        if (groupTransform && childTransform) {
          // We need to merge the two transforms rather than overwriting.
          commonProperties.set(
            'transform',
            groupTransform.mergeTransforms(childTransform),
          );
        }

        for (const [name, value] of commonProperties.entries()) {
          groupProperties.set(name, value);
        }

        let groupStyleAttValue =
          StyleAttValue.getAttValue(element) || new StyleAttValue('');
        for (const [name, value] of groupProperties.entries()) {
          groupStyleAttValue.set(name, value);
          element.svgAtts.delete(name);
        }
        groupStyleAttValue.updateElement(element);

        // Delete common properties from children.
        for (const child of element.children) {
          if (child.type === 'element') {
            const childStyleAttValue = StyleAttValue.getAttValue(child);
            for (const name of commonProperties.keys()) {
              if (childStyleAttValue) {
                childStyleAttValue.delete(name);
              }
              child.svgAtts.delete(name);
            }
            if (childStyleAttValue) {
              childStyleAttValue.updateElement(child);
            }
          }
        }
      },
    },
  };
};
