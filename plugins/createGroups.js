import { cssPropToString, getStyleDeclarations } from '../lib/css-tools.js';
import { cssTransformToSVGAtt } from '../lib/svg-to-css.js';
import { getHrefId, writeStyleAttribute } from '../lib/svgo/tools.js';
import { getInheritableProperties } from './_styles.js';

export const name = 'createGroups';
export const description =
  'Create groups if common properties can be moved to group';

const TRANSFORM_PROP_NAMES = ['transform', 'transform-origin'];

/**
 * @type {import('./plugins-types.js').Plugin<'createGroups'>}
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

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const elementsToCheck = new Set();

  /** @type {Set<string>} */
  const usedIds = new Set();

  return {
    element: {
      enter: (element) => {
        switch (element.name) {
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
        if (inheritablePropCounts.get(child) === numSharedProps) {
          savings += 9;
        }
      }
      return savings;
    }

    /**
     * @param {import('../lib/types.js').CSSDeclarationMap} props
     */
    function getPropSize(props) {
      let size = 0;
      for (const [k, v] of props.entries()) {
        size += k.length + v.value.toString().length + 2; // Add 2 for ":", ";"
      }
      return size;
    }
    const groupSize = index - sharedPropStart;
    const propSize = getPropSize(sharedProps);
    const cost =
      16 + // for <g style=""></g>
      propSize -
      1; // subract 1 for last ";"
    const savings =
      propSize * groupSize + getDeletedStyleAttSavings(sharedProps.size);
    const shouldCreateGroup =
      sharedProps.size > 0 && groupSize > 1 && cost < savings;
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
    /** @type {import('../lib/types.js').XastElement} */
    const groupElement = {
      type: 'element',
      parentNode: element,
      name: 'g',
      attributes: {},
      children: groupChildren,
    };

    // Add styles to group.
    const attTransform = cssTransformToSVGAtt(sharedProps.get('transform'));
    if (attTransform) {
      // Add transform as an attribute.
      sharedProps.delete('transform');
    }
    writeStyleAttribute(groupElement, sharedProps);

    // Remove properties from children.
    groupChildren.forEach((c) => {
      c.parentNode = groupElement;
      if (c.type !== 'element') {
        return;
      }
      const decls = getStyleDeclarations(c);

      for (const name of sharedProps.keys()) {
        delete c.attributes[name];
        if (decls) {
          decls.delete(name);
        }
      }
      if (attTransform) {
        delete c.attributes['transform'];
        if (decls) {
          decls.delete('transform');
        }
      }
      if (decls) {
        writeStyleAttribute(c, decls);
      }
    });

    // Add transform attribute.
    if (attTransform) {
      groupElement.attributes['transform'] = attTransform;
    }
    newChildren.push(groupElement);

    ungroupedStart = index;
  }

  /** @type {import('../lib/types.js').XastChild[]} */
  const newChildren = [];

  /** @type {import('../lib/types.js').CSSDeclarationMap} */
  let sharedProps = new Map();
  /** @type {Set<string>} */
  let transformProps = new Set();
  let sharedPropStart = 0;
  let ungroupedStart = 0;
  /** @type {Map<import('../lib/types.js').XastChild,number>} */
  let inheritablePropCounts = new Map();

  let index = 0;
  for (; index < element.children.length; index++) {
    const child = element.children[index];
    if (child.type !== 'element') {
      // Any non-elements can be included in the group.
      continue;
    }

    if (usedIds.has(child.attributes.id?.toString())) {
      // If the element is <use>d, we can't move any properties to a group, so it needs to be on its own.
      writeGroup(index);
      sharedProps = new Map();
      transformProps = new Set();
      sharedPropStart = index;
      continue;
    }

    const currentChildProps = getInheritableProperties(child);
    inheritablePropCounts.set(child, currentChildProps.size);
    // Record which transform properties are present.
    TRANSFORM_PROP_NAMES.forEach((name) => {
      if (currentChildProps.has(name)) {
        transformProps.add(name);
      }
    });

    if (sharedProps.size === 0) {
      sharedProps = currentChildProps;
      sharedPropStart = index;
      continue;
    }

    /** @type {import('../lib/types.js').CSSDeclarationMap} */
    const newSharedProps = new Map();

    // Copy any common shared properties.
    for (const [k, v] of sharedProps.entries()) {
      const currentProp = currentChildProps.get(k);
      if (currentProp && cssPropToString(currentProp) === cssPropToString(v)) {
        newSharedProps.set(k, v);
      }
    }

    // If both transform properties are present, either move them both or neither.
    if (
      transformProps.size === 2 &&
      !TRANSFORM_PROP_NAMES.every((name) => newSharedProps.has(name))
    ) {
      TRANSFORM_PROP_NAMES.forEach((name) => newSharedProps.delete(name));
    }

    if (newSharedProps.size > 0) {
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
        child.name === 'g' &&
        !elementsToCheck.has(child)
      ) {
        createGroups(child, usedIds, elementsToCheck);
      }
    }
  }
}
