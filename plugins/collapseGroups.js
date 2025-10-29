import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { SIMPLE_SELECTORS } from '../lib/css/styleData.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { hasAttributes } from '../lib/tools-ast.js';
import { elemsGroups } from './_collections.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'collapseGroups';
export const description = 'collapses useless groups';

const TRANSFORM_PROPS = ['transform', 'translate', 'scale', 'rotate'];
const INCOMPATIBLE_PROPS = ['clip-path', 'filter', 'mask'];

/**
 * Collapse useless groups.
 * @type {import('./plugins-types.js').Plugin<'collapseGroups'>}
 */
export function fn(info) {
  const styles = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styles === null ||
    !styles.hasOnlyFeatures(SIMPLE_SELECTORS) ||
    styles.hasTypeSelector('g')
  ) {
    return;
  }

  const childrenToDelete = new ChildDeletionQueue();

  return {
    element: {
      exit: (element, parentList) => {
        const parentNode = element.parentNode;
        if (parentNode.type === 'root' || parentNode.local === 'switch') {
          return;
        }

        if (element.local !== 'g' || element.children.length === 0) {
          return;
        }

        // move group attributes to the single child element
        if (hasAttributes(element) && element.children.length === 1) {
          const firstChild = element.children[0];
          if (
            firstChild.type === 'element' &&
            firstChild.svgAtts.get('id') === undefined &&
            (element.svgAtts.get('class') === undefined ||
              firstChild.svgAtts.get('class') === undefined)
          ) {
            const parentStyle = styles.computeStyle(element, parentList);

            if (parentStyle.get('display') === 'none') {
              // Delete the element and all its descendants.
              childrenToDelete.add(element);
              return;
            }

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
                  const t1 =
                    /** @type {import('../types/types.js').TransformAttValue} */ (
                      value
                    );
                  const merged =
                    childProp === undefined
                      ? t1
                      : t1.mergeTransforms(
                          /** @type {import('../types/types.js').TransformAttValue} */ (
                            childProp
                          ),
                        );
                  newChildElemProps.set(propName, merged);
                } else if (
                  childProp === undefined ||
                  childProp.toString() === 'inherit'
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
                const childAtt = firstChild.svgAtts.get(name);
                if (
                  childAtt === undefined ||
                  childAtt.toString() === value.toString()
                ) {
                  firstChild.svgAtts.set(name, value);
                  element.svgAtts.delete(name);
                }
              }
            }
          }
        }

        // collapse groups without attributes
        if (!hasAttributes(element)) {
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
    root: {
      exit: () => {
        childrenToDelete.delete();
      },
    },
  };
}

/**
 * @param {import('../lib/types.js').XastElement} child
 * @param {import('../lib/types.js').SvgAttValues} parentProps
 * @param {import('../lib/types.js').SvgAttValues} childProps
 * @param {import('../lib/types.js').StyleData} styleData
 * @returns
 */
function canCollapse(child, parentProps, childProps, styleData) {
  if (styleData.hasTypeSelector(child.local)) {
    return false;
  }
  for (const [propName, propValue] of parentProps.entries()) {
    if (propName === 'opacity') {
      if (childProps.get('opacity') !== undefined) {
        return false;
      }
    } else if (propName === 'transform') {
      const isKeyword =
        /** @type {import('../types/types.js').TransformAttValue} */ (
          propValue
        ).isKeyword();
      /** @type {import('../types/types.js').TransformAttValue|undefined} */
      const childTrans = childProps.get('transform');
      if (isKeyword) {
        // Can't collapse if the child has a transform.
        if (childTrans !== undefined) {
          return false;
        }
      } else {
        // Make sure the child is not a keyword.
        if (childTrans && childTrans.isKeyword()) {
          return false;
        }
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
    hasTransformCollision(parentStyles, childStyles) ||
    hasTransformCollision(childStyles, parentStyles)
  ) {
    return true;
  }

  // Don't overwrite child with any of these.
  return INCOMPATIBLE_PROPS.some(
    (propName) => parentStyles.has(propName) && childStyles.has(propName),
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

/**
 * @param {import('../lib/types.js').ComputedStyleMap} e1
 * @param {import('../lib/types.js').ComputedStyleMap} e2
 * @returns {boolean}
 */
function hasTransformCollision(e1, e2) {
  return (
    TRANSFORM_PROPS.some((propName) => e1.has(propName)) &&
    INCOMPATIBLE_PROPS.some((propName) => e2.has(propName))
  );
}
