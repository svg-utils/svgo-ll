import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { TransformAttValue } from '../lib/attrs/transformAttValue.js';
import { elemsGroups } from './_collections.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'collapseGroups';
export const description = 'collapses useless groups';

/**
 * Collapse useless groups.
 * @type {import('./plugins-types.js').Plugin<'collapseGroups'>}
 */
export function fn(info) {
  const styles = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styles === null ||
    !styles.hasOnlyFeatures([
      'class-selectors',
      'id-selectors',
      'type-selectors',
    ]) ||
    styles.hasTypeSelector('g')
  ) {
    return;
  }

  return {
    element: {
      exit: (element, parentList) => {
        const parentNode = element.parentNode;
        if (parentNode.type === 'root' || parentNode.local === 'switch') {
          return;
        }
        // non-empty groups
        if (element.local !== 'g' || element.children.length === 0) {
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
            firstChild.attributes.id === undefined &&
            (element.attributes.class === undefined ||
              firstChild.attributes.class === undefined)
          ) {
            const parentStyle = styles.computeStyle(element, parentList);
            /** @type {import('../lib/types.js').ParentList} */
            const childParents = parentList.slice();
            childParents.push({ element: element });
            const childStyle = styles.computeStyle(firstChild, childParents);

            const moveableParentProps = getPresentationProperties(element);
            const newChildElemProps = getPresentationProperties(firstChild);

            if (
              !canCollapse(
                firstChild,
                moveableParentProps,
                newChildElemProps,
                styles,
              )
            ) {
              return;
            }

            if (!elementHasUnmovableStyles(parentStyle, childStyle)) {
              for (const [propName, value] of moveableParentProps.entries()) {
                const childProp = newChildElemProps.get(propName);
                if (propName === 'transform') {
                  const t1 = TransformAttValue.createTransform(value.value);
                  const merged =
                    childProp === undefined
                      ? t1
                      : t1.mergeTransforms(
                          TransformAttValue.createTransform(childProp.value),
                        );
                  newChildElemProps.set(propName, {
                    value: merged,
                    important: false,
                  });
                } else if (
                  childProp === undefined ||
                  childProp.value.toString() === 'inherit'
                ) {
                  newChildElemProps.set(propName, value);
                }

                element.svgAtts.delete(propName);
                firstChild.svgAtts.delete(propName);
              }

              element.svgAtts.delete('style');
              new StyleAttValue(newChildElemProps).updateElement(firstChild);

              // Remove any child attributes that are overwritten by style properties.
              for (const name of newChildElemProps.keys()) {
                firstChild.svgAtts.delete(name);
              }

              // Move any remaining attributes from the parent to the child.
              for (const [name, value] of element.svgAtts.entries()) {
                if (
                  firstChild.attributes[name] === undefined ||
                  firstChild.attributes[name].toString() === value.toString()
                ) {
                  firstChild.attributes[name] = value;
                  delete element.attributes[name];
                }
              }
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
              elemsGroups.animation.has(child.local)
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
}

/**
 * @param {import('../lib/types.js').XastElement} child
 * @param {import('../lib/types.js').CSSDeclarationMap} parentProps
 * @param {import('../lib/types.js').CSSDeclarationMap} childProps
 * @param {import('../lib/types.js').StyleData} styleData
 * @returns
 */
function canCollapse(child, parentProps, childProps, styleData) {
  if (styleData.hasTypeSelector(child.local)) {
    return false;
  }
  for (const propName of parentProps.keys()) {
    if (propName === 'opacity') {
      if (childProps.get('opacity') !== undefined) {
        return false;
      }
    }
    if (hasAnimatedAttr(child, propName)) {
      return false;
    }
  }
  return true;
}

/**
 * @param {import('../lib/types.js').ComputedStyleMap} parentStyles
 * @param {import('../lib/types.js').ComputedStyleMap} childStyles
 * @returns {boolean}
 */
function elementHasUnmovableStyles(parentStyles, childStyles) {
  if (parentStyles.has('filter')) {
    return true;
  }
  if (
    parentStyles.has('transform') &&
    ['clip-path', 'filter', 'mask'].some(
      (propName) => childStyles.get(propName) !== undefined,
    )
  ) {
    return true;
  }
  if (
    childStyles.has('transform') &&
    ['clip-path', 'filter', 'mask'].some(
      (propName) => parentStyles.get(propName) !== undefined,
    )
  ) {
    return true;
  }

  // Don't overwrite child with any of these.
  return ['clip-path', 'filter', 'mask'].some(
    (propName) =>
      parentStyles.get(propName) !== undefined &&
      childStyles.get(propName) !== undefined,
  );
}

/**
 * @type {(node: import('../lib/types.js').XastNode, name: string) => boolean}
 */
const hasAnimatedAttr = (node, name) => {
  if (node.type === 'element') {
    if (
      elemsGroups.animation.has(node.local) &&
      node.svgAtts.get('attributeName')?.toString() === name
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
