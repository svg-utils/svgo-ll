import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { TransformValue } from '../lib/attrs/transformValue.js';
import { updateStyleAttribute } from '../lib/svgo/tools-svg.js';
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
                  newChildElemProps.set(propName, {
                    value: TransformValue.mergeTransforms(
                      value.value,
                      childProp?.value,
                    ),
                    important: false,
                  });
                } else if (
                  childProp === undefined ||
                  childProp.value.toString() === 'inherit'
                ) {
                  newChildElemProps.set(propName, value);
                }

                delete element.attributes[propName];
                delete firstChild.attributes[propName];
              }

              delete element.attributes.style;
              updateStyleAttribute(
                firstChild,
                new StyleAttValue(newChildElemProps),
              );

              // Remove any child attributes that are overwritten by style properties.
              for (const name of newChildElemProps.keys()) {
                delete firstChild.attributes[name];
              }

              // Move any remaining attributes from the parent to the child.
              for (const [name, value] of Object.entries(element.attributes)) {
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
 * @param {import('../lib/types.js').ComputedStyleMap} parentProps
 * @param {import('../lib/types.js').ComputedStyleMap} childProps
 * @returns {boolean}
 */
function elementHasUnmovableStyles(parentProps, childProps) {
  if (parentProps.has('filter')) {
    return true;
  }
  if (
    parentProps.has('transform') &&
    ['clip-path', 'filter', 'mask'].some(
      (propName) => childProps.get(propName) !== undefined,
    )
  ) {
    return true;
  }
  return (
    childProps.has('transform') &&
    ['clip-path', 'filter', 'mask'].some(
      (propName) => parentProps.get(propName) !== undefined,
    )
  );
}

/**
 * @type {(node: import('../lib/types.js').XastNode, name: string) => boolean}
 */
const hasAnimatedAttr = (node, name) => {
  if (node.type === 'element') {
    if (
      elemsGroups.animation.has(node.local) &&
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
