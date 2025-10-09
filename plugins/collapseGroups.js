import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { TransformValue } from '../lib/attrs/transformValue.js';
import { updateStyleAttribute } from '../lib/svgo/tools-svg.js';
import { inheritableAttrs, elemsGroups } from './_collections.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'collapseGroups';
export const description = 'collapses useless groups';

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

            if (!elementHasUnmovableProperties(parentStyle, childStyle)) {
              const moveableParentProps = getPresentationProperties(element);
              const newChildElemProps = getPresentationProperties(firstChild);

              for (const [name, value] of moveableParentProps.entries()) {
                if (
                  !moveAttr(
                    element,
                    firstChild,
                    newChildElemProps,
                    moveableParentProps,
                    childStyle,
                    name,
                    value,
                  )
                ) {
                  return;
                }
              }
              updateStyleAttribute(
                element,
                new StyleAttValue(moveableParentProps),
              );
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
 * @param {import('../lib/types.js').ComputedStyleMap} parentProps
 * @param {import('../lib/types.js').ComputedStyleMap} childProps
 * @returns {boolean}
 */
function elementHasUnmovableProperties(parentProps, childProps) {
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
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').XastElement} firstChild
 * @param {import('../lib/types.js').CSSDeclarationMap} newChildElemProps
 * @param {import('../lib/types.js').CSSDeclarationMap} parentProps
 * @param {import('../lib/types.js').ComputedStyleMap} childStyle
 * @param {string} propName
 * @param {import('../lib/types.js').CSSPropertyValue} value
 * @returns {boolean}
 */
function moveAttr(
  element,
  firstChild,
  newChildElemProps,
  parentProps,
  childStyle,
  propName,
  value,
) {
  // avoid copying to not conflict with animated attribute
  if (hasAnimatedAttr(firstChild, propName)) {
    return false;
  }

  const childProp = newChildElemProps.get(propName);
  if (childProp === undefined) {
    // Don't write the property to the child if it would change the calculated value.
    const calculatedValue = childStyle.get(propName);
    if (
      calculatedValue === undefined ||
      calculatedValue === value.value.toString()
    ) {
      newChildElemProps.set(propName, value);
    }
  } else if (propName === 'transform') {
    newChildElemProps.set(propName, {
      value: TransformValue.getObj(
        value.value.toString() + childProp.value.toString(),
      ),
      important: false,
    });
  } else if (childProp.value.toString() === 'inherit') {
    newChildElemProps.set(propName, value);
  } else if (
    !inheritableAttrs.has(propName) &&
    childProp.value.toString() !== value.value.toString()
  ) {
    return false;
  }

  delete element.attributes[propName];
  parentProps.delete(propName);

  return true;
}
