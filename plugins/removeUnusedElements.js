import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { addToMapArray, SVGOError } from '../lib/svgo/tools.js';
import { getHrefId, getReferencedIds2 } from '../lib/tools-ast.js';
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

  /** @type {Map<import('../lib/types.js').XastElement,boolean>} */
  const elementsToDelete = new Map();

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
          hoistDefsChildren(element);
          allDefs.push(element);
          return;
        }

        if (elemsGroups.nonRendering.has(element.local)) {
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
          elementsToDelete.set(element, false);
          return;
        }

        const opacity = properties.get('opacity')?.toString();
        if (opacity === '0' && !isInClipPath(element)) {
          elementsToDelete.set(element, true);
          return;
        }
      },
    },
    root: {
      exit: () => {
        const childrenToDelete = new ChildDeletionQueue();

        let currentElementsToDelete = elementsToDelete;
        const styleIds = styleData.getReferencedIds();
        while (true) {
          removeElements(
            currentElementsToDelete,
            childrenToDelete,
            idToReferences,
          );

          const nextElementsToDelete = new Map();

          // Remove the id attribute from any elements where it is not used.
          for (const [id, element] of idToElement) {
            const references = idToReferences.get(id);
            if (references === undefined || references.length === 0) {
              // Make sure it's not referenced by <style>.
              if (styleIds.has(id)) {
                continue;
              }

              element.svgAtts.delete('id');
              if (elemsGroups.nonRendering.has(element.local)) {
                // TODO: SOME OF THESE (E.G. CLIPPATH) MAY CONTAIN REFERENCED PATHS, ETC - NEED TO HANDLE THIS
                nextElementsToDelete.set(element, false);
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

        mergeDefs(allDefs, childrenToDelete);

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
      if (
        child.svgAtts.get('id') !== undefined &&
        !(child.uri === undefined && child.local === 'defs')
      ) {
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
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 * @returns {boolean}
 */
function hasReferencedChildren(element, idToReferences) {
  for (const child of element.children) {
    if (child.type !== 'element') {
      continue;
    }
    const id = child.svgAtts.get('id')?.toString();
    if (id) {
      const references = idToReferences.get(id);
      if (references !== undefined && references.length > 0) {
        return true;
      }
    }
    if (
      child.children.some(
        (grandchild) =>
          grandchild.type === 'element' &&
          hasReferencedChildren(grandchild, idToReferences),
      )
    ) {
      return true;
    }
  }
  return false;
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
 * @param {ChildDeletionQueue} childrenToDelete
 */
function mergeDefs(defs, childrenToDelete) {
  if (defs.length === 0) {
    return;
  }

  const mainDefs = defs[0];
  for (let index = 1; index < defs.length; index++) {
    // Move all children into the first <defs>.
    const element = defs[index];
    element.children.forEach((child) => (child.parentNode = mainDefs));
    mainDefs.children = mainDefs.children.concat(element.children);
    childrenToDelete.add(element);
  }
}

/**
 * @param {Map<import('../lib/types.js').XastElement,boolean>} elementsToDelete
 * @param {ChildDeletionQueue} childrenToDelete
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 */
function removeElements(elementsToDelete, childrenToDelete, idToReferences) {
  /** @type {Set<import('../lib/types.js').XastElement>} */
  const defsToHoist = new Set();

  for (const [element, onlyIfUnreferenced] of elementsToDelete) {
    // If the element has an id, remove references to it.
    const id = element.svgAtts.get('id')?.toString();
    if (id !== undefined) {
      const referencingElements = idToReferences.get(id);
      if (referencingElements) {
        if (onlyIfUnreferenced && referencingElements.length > 0) {
          continue;
        }
        for (const referencingElement of referencingElements) {
          removeIdReferencesFromElement(
            referencingElement,
            id,
            childrenToDelete,
          );
        }
      }
    }

    if (!hasReferencedChildren(element, idToReferences)) {
      childrenToDelete.add(element);
    } else {
      // If parent is <defs>, hoist the children.
      if (
        element.parentNode.type === 'element' &&
        element.parentNode.uri === undefined &&
        element.parentNode.local === 'defs'
      ) {
        defsToHoist.add(element.parentNode);
      }
    }
  }

  defsToHoist.forEach((defs) => hoistDefsChildren(defs));
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').ComputedPropertyMap} properties
 * @param {Map<import('../lib/types.js').XastElement,boolean>} elementsToDelete
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
        elementsToDelete.set(element, false);
        return true;
      }
      const commands = d.getParsedPath();
      if (commands.length === 1) {
        if (properties.get('marker-end') !== undefined) {
          return false;
        }
        elementsToDelete.set(element, false);
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
    if (child.type === 'element') {
      const id = child.svgAtts.get('id')?.toString();
      if (id !== undefined) {
        const refs = idToReferences.get(id);
        if (refs !== undefined && refs.length > 0) {
          // If the child is referenced, don't delete it.
          return;
        }
      }
      updateReferences(child, idToReferences);
    }
  });
}
