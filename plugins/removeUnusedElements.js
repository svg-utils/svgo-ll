import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { addToMapArray, SVGOError } from '../lib/svgo/tools.js';
import {
  getHrefId,
  getReferencedIds2,
  getSVGElement,
} from '../lib/tools-ast.js';
import { createElement } from '../lib/xast.js';
import { elemsGroups } from './_collections.js';

export const name = 'removeUnusedElements';
export const description = 'removes unused <defs> and non-displayed elements';

/** @type {import('./plugins-types.js').Plugin<'removeUnusedElements'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    !styleData.hasOnlyFeatures([
      'class-selectors',
      'id-selectors',
      'type-selectors',
    ])
  ) {
    return;
  }

  /** @type {import('../lib/types.js').XastElement[]} */
  const allDefs = [];

  /** @type {Map<string,import('../lib/types.js').XastElement>} */
  const idToElement = new Map();

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const idToReferences = new Map();

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const elementsToDelete = new Set();

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const moveToDefs = new Set();

  let defsLevel = 0;

  return {
    element: {
      enter: (element, parentList) => {
        if (element.uri !== undefined) {
          return;
        }

        const id = element.svgAtts.get('id')?.toString();
        if (id !== undefined) {
          if (idToElement.has(id)) {
            throw new SVGOError(`Duplicate id "${id}"`);
          }
          idToElement.set(id, element);
        }

        const referencedIds = getReferencedIds2(element);
        for (const info of referencedIds) {
          addToMapArray(idToReferences, info.id, element);
        }

        if (element.local === 'defs') {
          allDefs.push(element);
          defsLevel++;
          return;
        }

        if (elemsGroups.nonRendering.has(element.local)) {
          if (defsLevel === 0 && !parentIsMoving(element, moveToDefs)) {
            moveToDefs.add(element);
          }
          return;
        }

        const properties = styleData.computeProps(element, parentList);
        if (!properties) {
          return;
        }

        if (removeEmptyShapes(element, properties, elementsToDelete)) {
          return;
        }

        // Remove any rendering elements which are not visible.
        const display = properties.get('display')?.toString();
        if (
          display === 'none' &&
          // markers with display: none still rendered
          element.local !== 'marker'
        ) {
          elementsToDelete.add(element);
          return;
        }

        const opacity = properties.get('opacity')?.toString();
        if (opacity === '0' && !isInClipPath(element)) {
          elementsToDelete.add(element);
          return;
        }
      },
      exit: (element) => {
        if (element.uri === undefined && element.local === 'defs') {
          defsLevel--;
        }
      },
    },
    root: {
      exit: (root) => {
        // Move elements to <defs> if they are outside.
        if (moveToDefs.size > 0) {
          if (allDefs.length === 0) {
            // There is no defs; create one.
            const svg = getSVGElement(root);
            allDefs.push(createElement(svg, 'defs'));
          }

          // First remove them from existing parents.
          const dq = new ChildDeletionQueue();
          moveToDefs.forEach((element) => {
            dq.add(element);
          });
          dq.delete();

          // Move to first <defs>.
          const defs = allDefs[0];
          moveToDefs.forEach((element) => {
            defs.children.push(element);
            element.parentNode = defs;
          });
        }

        // Process <defs> so that all immediate children have ids.
        allDefs.forEach((defs) => hoistDefsChildren(defs));

        const childrenToDelete = new ChildDeletionQueue();

        let currentElementsToDelete = elementsToDelete;
        while (true) {
          removeElements(
            currentElementsToDelete,
            childrenToDelete,
            idToReferences,
          );

          const nextElementsToDelete = new Set();

          // Remove the id attribute from any elements where it is not used.
          for (const [id, element] of idToElement) {
            const references = idToReferences.get(id);
            if (references === undefined || references.length === 0) {
              element.svgAtts.delete('id');
              if (elemsGroups.nonRendering.has(element.local)) {
                // TODO: SOME OF THESE (E.G. CLIPPATH) MAY CONTAIN REFERENCED PATHS, ETC - NEED TO HANDLE THIS
                nextElementsToDelete.add(element);
                idToElement.delete(id);

                // If this element references others, remove this element from the list of references to those ids.
                updateReferences(element, idToReferences);
              }
            }
          }

          if (nextElementsToDelete.size === 0) {
            break;
          }
          currentElementsToDelete = nextElementsToDelete;
        }

        mergeDefs(allDefs, elementsToDelete);

        childrenToDelete.delete();
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastChild} child
 * @returns {import('../lib/types.js').XastChild[]}
 */
function getChildrenWithIds(child) {
  switch (child.type) {
    case 'comment':
      return [child];
    case 'element':
      if (child.svgAtts.get('id') !== undefined) {
        return [child];
      }
      break;
    default:
      return [];
  }

  // Preserve styles and scripts with no id.
  switch (child.local) {
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
function hoistDefsChildren(element) {
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
 * @returns {boolean}
 */
function isInClipPath(element) {
  let parent = element.parentNode;
  while (parent.type !== 'root') {
    if (parent.uri === undefined && parent.local === 'clipPath') {
      return true;
    }
    parent = parent.parentNode;
  }
  return false;
}

/**
 * @param {import('../lib/types.js').XastElement[]} defs
 * @param {Set<import('../lib/types.js').XastElement>} elementsToDelete
 */
function mergeDefs(defs, elementsToDelete) {
  if (defs.length === 0) {
    return;
  }

  const mainDefs = defs[0];
  for (let index = 1; index < defs.length; index++) {
    // Move all children into the first <defs>.
    const element = defs[index];
    element.children.forEach((child) => (child.parentNode = mainDefs));
    mainDefs.children = mainDefs.children.concat(element.children);
    elementsToDelete.add(element);
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {Set<import('../lib/types.js').XastElement>} moveToDefs
 * @returns {boolean}
 */
function parentIsMoving(element, moveToDefs) {
  while (element.parentNode.type !== 'root') {
    if (moveToDefs.has(element.parentNode)) {
      return true;
    }
    element = element.parentNode;
  }
  return false;
}

/**
 * @param {Set<import('../lib/types.js').XastElement>} elementsToDelete
 * @param {ChildDeletionQueue} childrenToDelete
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 */
function removeElements(elementsToDelete, childrenToDelete, idToReferences) {
  for (const element of elementsToDelete) {
    childrenToDelete.add(element);

    // If the element has an id, remove references to it.
    const id = element.svgAtts.get('id')?.toString();
    if (id !== undefined) {
      const referencingElements = idToReferences.get(id);
      if (referencingElements) {
        for (const referencingElement of referencingElements) {
          removeIdReferencesFromElement(
            referencingElement,
            id,
            childrenToDelete,
          );
        }
      }
    }
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').ComputedPropertyMap} properties
 * @param {Set<import('../lib/types.js').XastElement>} elementsToDelete
 * @returns {boolean}
 */
function removeEmptyShapes(element, properties, elementsToDelete) {
  switch (element.local) {
    case 'path': {
      const d =
        /** @type {import('../types/types.js').PathAttValue|undefined|null} */ (
          properties.get('d')
        );
      if (d === null) {
        return false;
      }
      if (d === undefined) {
        elementsToDelete.add(element);
        return true;
      }
      const commands = d.getParsedPath();
      if (commands.length === 1) {
        if (properties.get('marker-end') !== undefined) {
          return false;
        }
        elementsToDelete.add(element);
        return true;
      }

      return false;
    }
  }
  return false;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} id
 * @param {ChildDeletionQueue} childrenToDelete
 */
function removeIdReferencesFromElement(element, id, childrenToDelete) {
  if (element.local === 'use') {
    const hrefId = getHrefId(element);
    if (hrefId === id) {
      // TODO: REMOVE ANY OTHER REFERENCES FROM THIS ELEMENT
      childrenToDelete.add(element);
    }
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 */
function updateReferences(element, idToReferences) {
  const currentElReferences = getReferencedIds2(element);
  for (const reference of currentElReferences) {
    const elements = idToReferences.get(reference.id);
    if (elements) {
      idToReferences.set(
        reference.id,
        elements.filter((e) => e !== element),
      );
    }
  }
  // Update references in children.
  element.children.forEach((child) => {
    // If the child has an id, it will be handled later.
    if (child.type === 'element' && child.svgAtts.get('id') === undefined) {
      updateReferences(child, idToReferences);
    }
  });
}
