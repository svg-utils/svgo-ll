import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';
import { getHrefId } from '../lib/svgo/tools.js';
import { inheritableAttrs } from './_collections.js';

export const name = 'createGroups';
export const description =
  'Create groups if common properties can be moved to group';

/**
 * @type {import('./plugins-types.js').Plugin<'createGroups'>}
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  /** @type {import('../lib/types.js').XastElement[]} */
  const elementsToCheck = [];

  /** @type {Set<string>} */
  const usedIds = new Set();

  return {
    element: {
      enter: (element) => {
        switch (element.name) {
          case 'g':
          case 'svg':
            elementsToCheck.push(element);
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
        elementsToCheck.forEach((e) => createGroups(e, usedIds));
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {Set<string>} usedIds
 */
function createGroups(element, usedIds) {
  if (element.children.length < 2) {
    return;
  }

  /**
   * @param {number} index
   */
  function writeGroup(index) {
    const groupSize = index - sharedPropStart;
    const shouldCreateGroup = sharedProps.size > 0 && groupSize > 1;
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
      if (decls) {
        writeStyleAttribute(c, decls);
      }
    });
    newChildren.push(groupElement);

    ungroupedStart = index;
  }

  /** @type {import('../lib/types.js').XastChild[]} */
  const newChildren = [];

  /** @type {import('../lib/types.js').CSSDeclarationMap} */
  let sharedProps = new Map();
  let sharedPropStart = 0;
  let ungroupedStart = 0;

  let index = 0;
  for (; index < element.children.length; index++) {
    const child = element.children[index];
    if (child.type !== 'element') {
      // Any non-elements can be included in the group.
      continue;
    }

    if (usedIds.has(child.attributes.id)) {
      // If the element is <use>d, we can't move any properties to a group, so it needs to be on its own.
      writeGroup(index);
      sharedProps = new Map();
      sharedPropStart = index;
      continue;
    }

    const currentChildProps = getInheritableProperties(child);
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
      if (currentProp && currentProp.value === v.value) {
        newSharedProps.set(k, v);
      }
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
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').CSSDeclarationMap}
 */
function getInheritableProperties(element) {
  /** @type {import('../lib/types.js').CSSDeclarationMap} */
  const props = new Map();

  // Gather all inheritable attributes.
  for (const [k, v] of Object.entries(element.attributes)) {
    if (inheritableAttrs.has(k)) {
      props.set(k, { value: v, important: false });
    }
  }

  // Overwrite with inheritable properties.
  const styleProps = getStyleDeclarations(element);
  if (styleProps) {
    styleProps.forEach((v, k) => {
      if (inheritableAttrs.has(k)) {
        if (v === null) {
          props.delete(k);
        } else {
          props.set(k, v);
        }
      }
    });
  }

  return props;
}
