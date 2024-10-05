import { getReferencedIds } from '../lib/svgo/tools.js';
import { elemsGroups } from './_collections.js';
import { parsePathCommands, PathParseError } from './minifyPathData.js';

export const name = 'removeHiddenElems';
export const description =
  'removes non-rendered elements that are not referenced';

/**
 * @type {import('./plugins-types.js').Plugin<'removeHiddenElems'>}
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    !styleData.hasOnlyFeatures(['simple-selectors', 'attribute-selectors'])
  ) {
    return;
  }

  // Record which elements to delete, sorted by parent.
  /** @type {Map<import('../lib/types.js').XastParent, Set<import('../lib/types.js').XastChild>>} */
  const childrenToDeleteByParent = new Map();

  /** @type {Map<string,Set<(import('../lib/types.js').XastElement|undefined)>>} */
  const referencedIds = new Map();
  for (const id of styleData.getReferencedIds().keys()) {
    addIdReference(id, undefined);
  }

  /** @type {Map<import('../lib/types.js').XastElement,Set<string>>} */
  const nonRenderedElements = new Map();

  /** @type {import('../lib/types.js').XastElement[]} */
  const nonRenderingStack = [];

  /**
   * @param {string} id
   * @param {import('../lib/types.js').XastElement|undefined} element
   */
  function addIdReference(id, element) {
    let referencingElements = referencedIds.get(id);
    if (!referencingElements) {
      referencingElements = new Set();
      referencedIds.set(id, referencingElements);
    }
    referencingElements.add(element);
  }

  /**
   * @param {import('../lib/types.js').XastChild} child
   * @returns {import('../lib/types.js').XastChild[]}
   */
  function getChildrenWithIds(child) {
    switch (child.type) {
      case 'comment':
        return [child];
      case 'element':
        if (child.attributes.id) {
          return [child];
        }
        break;
      default:
        return [];
    }

    // Preserve styles and scripts with no id.
    switch (child.name) {
      case 'script':
      case 'style':
        return [child];
    }

    // It's an element with no id; return its children which have ids.
    const children = [];
    for (const grandchild of child.children) {
      children.push(...getChildrenWithIds(grandchild));
    }
    return children;
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
   */
  function processDefsChildren(element) {
    /** @type {import('../lib/types.js').XastChild[]} */
    const children = [];

    // Make sure all children of <defs> have an id; otherwise they can't be rendered. If a child doesn't have an id, delete it and move up
    // its children so they are immediate children of the <defs>.
    for (const child of element.children) {
      children.push(...getChildrenWithIds(child));
    }
    children.forEach((c) => (c.parentNode = element));
    element.children = children;
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
   */
  function recordReferencedIds(element) {
    const ids = getReferencedIds(element);
    for (const id of ids) {
      addIdReference(id.id, element);
    }
    return ids.length !== 0;
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
   */
  function removeElement(element) {
    let childrenToDelete = childrenToDeleteByParent.get(element.parentNode);
    if (!childrenToDelete) {
      childrenToDelete = new Set();
      childrenToDeleteByParent.set(element.parentNode, childrenToDelete);
    }
    childrenToDelete.add(element);
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
   * @param {Map<string,string|null>} properties
   * @returns {boolean}
   */
  function removeEmptyShapes(element, properties) {
    switch (element.name) {
      case 'ellipse':
        // Ellipse with zero radius
        // https://svgwg.org/svg2-draft/geometry.html#RxProperty
        if (
          element.children.length === 0 &&
          (element.attributes.rx === '0' || element.attributes.ry === '0')
        ) {
          removeElement(element);
          return true;
        }
        return false;
      case 'path': {
        if (!element.attributes.d) {
          removeElement(element);
          return true;
        }
        try {
          const commands = parsePathCommands(element.attributes.d, 2);
          if (commands.length === 1) {
            if (properties.get('marker-end') !== undefined) {
              return false;
            }
            removeElement(element);
            return true;
          }
        } catch (error) {
          if (error instanceof PathParseError) {
            console.warn(error.message);
            return false;
          }
          throw error;
        }
        return false;
      }
      case 'rect':
        // https://svgwg.org/svg2-draft/shapes.html#RectElement
        if (
          element.children.length === 0 &&
          (!element.attributes.width ||
            !element.attributes.height ||
            element.attributes.width === '0' ||
            element.attributes.height === '0')
        ) {
          removeElement(element);
          return true;
        }
        break;
    }

    return false;
  }

  return {
    element: {
      enter: (element, parentNode, parentInfo) => {
        // Record any ids referenced by this element.
        recordReferencedIds(element);

        if (element.name === 'defs') {
          processDefsChildren(element);
          return;
        }

        // Process non-rendering elements.
        if (elemsGroups.nonRendering.has(element.name)) {
          if (!element.attributes.id) {
            // If the element doesn't have an id, it can't be referenced; but it may contain referenced elements. Change it to <defs>.
            element.name = 'defs';
            processDefsChildren(element);
          } else {
            nonRenderingStack.push(element);
          }
          return;
        }

        if (element.attributes.id) {
          // Never delete elements with an id.
          return;
        }

        const properties = styleData.computeStyle(element, parentInfo);
        if (!properties) {
          return;
        }

        if (removeEmptyShapes(element, properties)) {
          return;
        }

        // Remove any rendering elements which are not visible.

        const display = properties.get('display');
        if (
          display === 'none' &&
          // markers with display: none still rendered
          element.name !== 'marker'
        ) {
          removeElement(element);
          return;
        }

        if (nonRenderingStack.length === 0) {
          // Don't delete elements with opacity 0 which are in a non-rendering element.
          const opacity = properties.get('opacity');
          if (opacity === '0') {
            removeElement(element);
          }
        }
      },
      exit: (element) => {
        if (elemsGroups.nonRendering.has(element.name)) {
          nonRenderingStack.pop();
        }
      },
    },
    root: {
      exit: () => {
        for (const element of nonRenderedElements.keys()) {
          removeElement(element);
        }

        // For each parent, delete no longer needed children.
        for (const [parent, childrenToDelete] of childrenToDeleteByParent) {
          parent.children = parent.children.filter(
            (c) => !childrenToDelete.has(c),
          );
        }
      },
    },
  };
};
