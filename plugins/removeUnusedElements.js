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
      'attribute-selectors',
    ])
  ) {
    return;
  }

  /** @type {import('../lib/types.js').XastElement[]} */
  const defs = [];

  /** @type {Map<string,import('../lib/types.js').XastElement>} */
  const idToElement = new Map();

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const idToReferences = new Map();

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const elementsToDelete = new Set();

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
          defs.push(element);
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
    },
    root: {
      exit: () => {
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
              }
            }
          }

          if (nextElementsToDelete.size === 0) {
            break;
          }
          currentElementsToDelete = nextElementsToDelete;
        }

        mergeDefs(defs, elementsToDelete);

        childrenToDelete.delete();
      },
    },
  };
};

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
