import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { getAllowedAttributes } from '../lib/utils/tools-collections.js';
import { elemsGroups, uselessShapeProperties } from './_collections.js';
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

        const commonProperties = new SvgAttMap();
        /** @type {Set<string>} */
        const uncommonProperties = new Set();
        /** @type {Set<string>} */
        const transformPropertiesFound = new Set();

        for (let index = 0; index < element.children.length; index++) {
          const child = element.children[index];

          if (child.type !== 'element') {
            continue;
          }

          const childProperties = getInheritableProperties(child);

          for (const [
            propName,
            propValueCurrent,
          ] of childProperties.entries()) {
            if (uncommonProperties.has(propName)) {
              // Already rejected this one.
              continue;
            }
            const commonValue = commonProperties.get(propName);
            if (commonValue === undefined) {
              // We haven't seen this property yet. If the property is not relevant to all previous children, include it.
              if (propNotAllowedForPrevChildren(propName, element, index)) {
                commonProperties.set(propName, propValueCurrent);
              } else {
                uncommonProperties.add(propName);
              }
            }
          }

          // Check all the current common properties and make sure they are valid for this element
          for (const [name, commonValue] of commonProperties.entries()) {
            const childProperty = childProperties.get(name);
            if (childProperty === undefined) {
              // Allow only if it is not relevant for this element.
              if (!propAllowedForElement(name, child)) {
                continue;
              }
            } else if (
              childProperty.toString() === commonValue.toString() &&
              childProperty.isImportant() === commonValue.isImportant()
            ) {
              continue;
            }
            uncommonProperties.add(name);
            commonProperties.delete(name);
          }

          // Record any transform properties found.
          TRANSFORM_PROP_NAMES.forEach((name) => {
            if (childProperties.get(name)) {
              transformPropertiesFound.add(name);
            }
          });
        }

        if (commonProperties.count() === 0) {
          return;
        }

        const groupOwnStyle = styleData.computeOwnProps(element);

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

        /** @type {StyleAttValue} */
        let groupStyleAttValue =
          element.svgAtts.get('style') || new StyleAttValue('');
        for (const [name, value] of groupProperties.entries()) {
          element.svgAtts.delete(name);
          if (name === 'transform') {
            if (
              /** @type {import('../types/types.js').TransformAttValue} */ (
                value
              ).isIdentityTransform()
            ) {
              continue;
            }
          }
          groupStyleAttValue.set(name, value);
        }
        groupStyleAttValue.updateElement(element);

        // Delete common properties from children.
        for (const child of element.children) {
          if (child.type === 'element') {
            /** @type {StyleAttValue|undefined} */
            const childStyleAttValue = child.svgAtts.get('style');
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

/**
 * @param {string} propName
 * @param {import('../lib/types.js').XastElement} element
 * @returns {boolean}
 */
function propAllowedForElement(propName, element) {
  const allowedAtts = getAllowedAttributes(element.local);
  if (allowedAtts === undefined) {
    return true;
  }
  if (!allowedAtts.has(propName)) {
    return false;
  }
  return !(
    elemsGroups.shape.has(element.local) && uselessShapeProperties.has(propName)
  );
}

/**
 * @param {string} propName
 * @param {import('../lib/types.js').XastElement} element
 * @param {number} currentIndex
 * @return {boolean}
 */
function propNotAllowedForPrevChildren(propName, element, currentIndex) {
  for (let index = 0; index < currentIndex; index++) {
    const child = element.children[index];
    if (child.type !== 'element') {
      continue;
    }
    if (propAllowedForElement(propName, child)) {
      return false;
    }
  }
  return true;
}
