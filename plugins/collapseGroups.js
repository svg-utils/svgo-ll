import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { updateStyleAttribute } from '../lib/svgo/tools-svg.js';
import { inheritableAttrs, elemsGroups } from './_collections.js';

export const name = 'collapseGroups';
export const description = 'collapses useless groups';

/**
 * @type {(node: import('../lib/types.js').XastNode, name: string) => boolean}
 */
const hasAnimatedAttr = (node, name) => {
  if (node.type === 'element') {
    if (
      elemsGroups.animation.has(node.name) &&
      node.attributes.attributeName === name
    ) {
      return true;
    }
    for (const child of node.children) {
      if (hasAnimatedAttr(child, name)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Collapse useless groups.
 * @type {import('./plugins-types.js').Plugin<'collapseGroups'>}
 */
export const fn = (info) => {
  const styles = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styles === null ||
    !styles.hasOnlyFeatures(['simple-selectors'])
  ) {
    return;
  }

  return {
    element: {
      exit: (element, parentList) => {
        const parentNode = element.parentNode;
        if (parentNode.type === 'root' || parentNode.name === 'switch') {
          return;
        }
        // non-empty groups
        if (element.name !== 'g' || element.children.length === 0) {
          return;
        }

        // move group attributes to the single child element
        if (
          Object.keys(element.attributes).length !== 0 &&
          element.children.length === 1
        ) {
          const firstChild = element.children[0];
          if (
            firstChild.type === 'element' &&
            firstChild.attributes.id == null &&
            (element.attributes.class == null ||
              firstChild.attributes.class == null)
          ) {
            const properties = styles.computeStyle(element, parentList);

            if (!elementHasUnmovableProperties(properties)) {
              const newChildElemAttrs = { ...firstChild.attributes };

              const styleAttValue = StyleAttValue.getStyleAttValue(element);

              for (const [name, value] of Object.entries(element.attributes)) {
                if (
                  !moveAttr(
                    element,
                    firstChild,
                    newChildElemAttrs,
                    styleAttValue,
                    name,
                    value,
                  )
                ) {
                  return;
                }
              }

              // Move style attributes.
              if (styleAttValue) {
                for (const [name, value] of styleAttValue.entries()) {
                  if (
                    !moveAttr(
                      element,
                      firstChild,
                      newChildElemAttrs,
                      styleAttValue,
                      name,
                      value.value,
                    )
                  ) {
                    return;
                  }
                }
                updateStyleAttribute(element, styleAttValue);
              }

              firstChild.attributes = newChildElemAttrs;
            }
          }
        }

        // collapse groups without attributes
        if (Object.keys(element.attributes).length === 0) {
          // animation elements "add" attributes to group
          // group should be preserved
          for (const child of element.children) {
            if (
              child.type === 'element' &&
              elemsGroups.animation.has(child.name)
            ) {
              return;
            }
          }

          // Replace current node with all its children. Don't use splice(); if the child array is very large, it can trigger the
          // "RangeError: Maximum call stack size exceeded" error.
          const index = parentNode.children.indexOf(element);
          parentNode.children = parentNode.children
            .slice(0, index)
            .concat(element.children, parentNode.children.slice(index + 1));
          for (const child of element.children) {
            child.parentNode = parentNode;
          }
        }
      },
    },
  };
};

/**
 * @param {Map<string,string|null>} properties
 * @returns {boolean}
 */
function elementHasUnmovableProperties(properties) {
  if (properties.get('transform') && properties.get('clip-path')) {
    return true;
  }
  return ['filter', 'mask'].some(
    (propName) => properties.get(propName) !== undefined,
  );
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').XastElement} firstChild
 * @param {Object<string,import('../lib/types.js').SVGAttValue>} newChildElemAttrs
 * @param {StyleAttValue|undefined} styleAttValue
 * @param {string} propName
 * @param {import('../lib/types.js').SVGAttValue} value
 * @returns {boolean}
 */
function moveAttr(
  element,
  firstChild,
  newChildElemAttrs,
  styleAttValue,
  propName,
  value,
) {
  // avoid copying to not conflict with animated attribute
  if (hasAnimatedAttr(firstChild, propName)) {
    return false;
  }

  if (propName === 'clip-path') {
    // Don't move clip-path if child has a transform.
    if (firstChild.attributes['transform']) {
      return true;
    }
  } else if (propName === 'style') {
    // Style attribute will be handled separately.
    return true;
  }

  if (newChildElemAttrs[propName] === undefined) {
    newChildElemAttrs[propName] = value;
  } else if (propName === 'transform') {
    newChildElemAttrs[propName] = value + ' ' + newChildElemAttrs[propName];
  } else if (newChildElemAttrs[propName] === 'inherit') {
    newChildElemAttrs[propName] = value;
  } else if (
    !inheritableAttrs.has(propName) &&
    newChildElemAttrs[propName] !== value
  ) {
    return false;
  }

  delete element.attributes[propName];
  if (styleAttValue) {
    styleAttValue.delete(propName);
  }

  return true;
}
