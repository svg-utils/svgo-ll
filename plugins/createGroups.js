import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { getHrefId } from '../lib/tools-ast.js';
import { createElement } from '../lib/xast.js';
import { getInheritableProperties, TRANSFORM_PROP_NAMES } from './_styles.js';

export const name = 'createGroups';
export const description =
  'Create groups if common properties can be moved to group';

const CLIP_PROP_NAMES = ['clip-path', 'transform'];

/** @type {import('./plugins-types.js').Plugin<'createGroups'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const elementsToCheck = new Set();

  /** @type {Set<string>} */
  const usedIds = new Set();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          // Not in the SVG namespace.
          return;
        }

        switch (element.local) {
          case 'g':
          case 'svg':
            elementsToCheck.add(element);
            break;
          case 'use':
            {
              const id = getHrefId(element);
              if (id) {
                usedIds.add(id);
              }
            }
            break;
        }
      },
    },
    root: {
      exit: () => {
        elementsToCheck.forEach((e) =>
          createGroups(e, usedIds, elementsToCheck),
        );
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {Set<string>} usedIds
 * @param {Set<import('../lib/types.js').XastElement>} elementsToCheck
 */
function createGroups(element, usedIds, elementsToCheck) {
  if (element.children.length < 2) {
    return;
  }

  /**
   * @param {number} index
   */
  function writeGroup(index) {
    /**
     * @param {number} numSharedProps
     */
    function getDeletedStyleAttSavings(numSharedProps) {
      // For any elements where we are moving all properties, ' style=""' will be removed.
      let savings = 0;
      for (let i = sharedPropStart; i < index; i++) {
        const child = element.children[i];
        if (propCounts.get(child) === numSharedProps) {
          savings += 9;
        }
      }
      return savings;
    }

    const groupSize = index - sharedPropStart;
    const propSize = StyleAttValue.getPropertyString(
      sharedProps.entries(),
    ).length;
    const cost =
      16 + // for <g style=""></g>
      propSize -
      1; // subract 1 for last ";"
    const savings =
      propSize * groupSize + getDeletedStyleAttSavings(sharedProps.count());
    const shouldCreateGroup =
      sharedProps.count() > 0 && groupSize > 1 && cost < savings;
    if (newChildren.length === 0 && !shouldCreateGroup) {
      // No groups have been written yet, and there is no reason to write one here.
      return;
    }

    if (!shouldCreateGroup) {
      if (index === element.children.length) {
        // This is the final group; write any ungrouped children.
        newChildren.push(...element.children.slice(ungroupedStart));
      }
      return;
    }

    // Copy any ungrouped children to newChildren.
    newChildren.push(
      ...element.children.slice(ungroupedStart, sharedPropStart),
    );
    const groupChildren = element.children.slice(sharedPropStart, index);
    const groupElement = createElement(
      element,
      'g',
      element.prefix,
      undefined,
      undefined,
      groupChildren,
      false,
      false,
    );

    // Add styles to group.
    new StyleAttValue(sharedProps).updateElement(groupElement);

    // Remove properties from children.
    groupChildren.forEach((child) => {
      child.parentNode = groupElement;
      if (child.type !== 'element') {
        return;
      }
      const styleAttValue = StyleAttValue.getAttValue(child);

      for (const name of sharedProps.keys()) {
        child.svgAtts.delete(name);
        if (styleAttValue) {
          styleAttValue.delete(name);
        }
      }

      if (styleAttValue) {
        styleAttValue.updateElement(child);
      }
    });

    newChildren.push(groupElement);

    ungroupedStart = index;
  }

  /** @type {import('../lib/types.js').XastChild[]} */
  const newChildren = [];

  /** @type {import('../lib/types.js').SvgAttValues} */
  let sharedProps = new SvgAttMap();

  /** @type {Set<string>} */
  let clipProps = new Set();
  /** @type {Set<string>} */
  let transformProps = new Set();

  let sharedPropStart = 0;
  let ungroupedStart = 0;
  /** @type {Map<import('../lib/types.js').XastChild,number>} */
  let propCounts = new Map();

  let index = 0;
  for (; index < element.children.length; index++) {
    const child = element.children[index];
    if (child.type !== 'element') {
      // Any non-elements can be included in the group.
      continue;
    }

    const id = child.svgAtts.get('id')?.toString();
    if (id !== undefined && usedIds.has(id)) {
      // If the element is <use>d, we can't move any properties to a group, so it needs to be on its own.
      writeGroup(index);
      sharedProps = new SvgAttMap();
      transformProps = new Set();
      sharedPropStart = index;
      continue;
    }

    const currentChildProps = getInheritableProperties(child);
    propCounts.set(child, currentChildProps.count());

    // Some combinations of properties must be moved as a unit if present; record which properties are present.
    TRANSFORM_PROP_NAMES.forEach((name) => {
      if (currentChildProps.get(name)) {
        transformProps.add(name);
      }
    });
    CLIP_PROP_NAMES.forEach((name) => {
      if (currentChildProps.get(name)) {
        clipProps.add(name);
      }
    });

    if (sharedProps.count() === 0) {
      sharedProps = currentChildProps;
      sharedPropStart = index;
      continue;
    }

    const newSharedProps = new SvgAttMap();

    // Copy any common shared properties.
    for (const [k, v] of sharedProps.entries()) {
      const currentProp = currentChildProps.get(k);
      if (currentProp && currentProp.toString() === v.toString()) {
        newSharedProps.set(k, v);
      }
    }

    // If both transform properties are present, either move them both or neither.
    if (
      transformProps.size === 2 &&
      !TRANSFORM_PROP_NAMES.every(
        (name) => newSharedProps.get(name) !== undefined,
      )
    ) {
      TRANSFORM_PROP_NAMES.forEach((name) => newSharedProps.delete(name));
    }
    if (
      clipProps.size === 2 &&
      !CLIP_PROP_NAMES.every((name) => newSharedProps.get(name) !== undefined)
    ) {
      CLIP_PROP_NAMES.forEach((name) => newSharedProps.delete(name));
    }

    if (newSharedProps.count() > 0) {
      // There are still some common properties, try the next child.
      sharedProps = newSharedProps;
      continue;
    }

    // There are no more common properties. Add the previous set of children to a group, and start a new set of common properties.
    // Copy any ungrouped children to newChildren.
    writeGroup(index);
    sharedProps = currentChildProps;
    sharedPropStart = index;
  }

  // Write any remaining children and the last group.
  writeGroup(index);

  // Update the children if any groups were created.
  if (newChildren.length) {
    element.children = newChildren;
    // See if the new groups can be split further.
    for (const child of element.children) {
      if (
        child.type === 'element' &&
        child.local === 'g' &&
        !elementsToCheck.has(child)
      ) {
        createGroups(child, usedIds, elementsToCheck);
      }
    }
  }
}
