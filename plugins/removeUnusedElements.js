import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import {
  addToMapArray,
  getEllipseProperties,
  SVGOError,
} from '../lib/svgo/tools.js';
import {
  getHrefId,
  getReferencedIds2,
  hasAttributes,
  isDescendantOf,
} from '../lib/tools-ast.js';
import { elemsGroups } from './_collections.js';

export const name = 'removeUnusedElements';
export const description = 'removes unused <defs> and non-displayed elements';

const renderedElements = new Set([
  'a',
  'image',
  'text',
  'textPath',
  'tspan',
  'use',
]);
elemsGroups.shape.forEach((name) => renderedElements.add(name));

const uselessContainers = new Set([
  'a',
  'clipPath',
  'g',
  'marker',
  'mask',
  'pattern',
  'svg',
  'symbol',
]);

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

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const clipPaths = new Set();

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
          return;
        }

        if (elemsGroups.nonRendering.has(element.local)) {
          if (id === undefined) {
            elementsToDelete.set(element, true);
            switch (element.local) {
              case 'clipPath':
              case 'mask':
              case 'pattern':
              case 'symbol':
                // Since there is no id, they can't be referenced directly, but may contain referenced content; convert
                // to <defs>.
                convertToDefs(element, allDefs);
                break;
            }
          }
          if (element.local === 'clipPath') {
            clipPaths.add(element);
          }
          return;
        }

        // Remove <use>, <image> or shape with no id in <defs>.
        if (
          id === undefined &&
          renderedElements.has(element.local) &&
          isDefsChild(element)
        ) {
          elementsToDelete.set(element, false);
          return;
        }

        // Treat <g> with no id in <defs> as <defs>.
        if (
          id === undefined &&
          uselessContainers.has(element.local) &&
          isDefsChild(element)
        ) {
          convertToDefs(element, allDefs);
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
        if (display === 'none') {
          switch (element.local) {
            case 'g':
              convertToDefs(element, allDefs);
              return;
            case 'marker':
              // markers with display: none still rendered
              break;
            default:
              elementsToDelete.set(element, false);
              return;
          }
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
        const styleIds = styleData.getReferencedIds();

        deleteElementsAndClipPath(
          elementsToDelete,
          idToElement,
          idToReferences,
          allDefs,
          clipPaths,
          styleIds,
        );

        // Merge defs after all elements have been removed.
        mergeDefs(allDefs);
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').XastElement[]} allDefs
 */
function convertToDefs(element, allDefs) {
  element.local = 'defs';
  allDefs.push(element);

  // A non-displaying <g> may contain referenced elements. The attributes are ignored since display="none".
  for (const [attName, value] of element.svgAtts.entries()) {
    switch (attName) {
      case 'color':
        // color seems to be required in some cases; see test 55.
        continue;
      case 'style':
        {
          const style =
            /** @type {import('../types/types.js').StyleAttValue} */ (value);
          for (const propName of style.keys()) {
            if (propName !== 'color') {
              style.delete(propName);
            }
          }
          style.updateElement(element);
        }
        continue;
    }
    element.svgAtts.delete(attName);
  }
}

/**
 * @param {Map<import('../lib/types.js').XastElement,boolean>} elementsToDelete
 * @param {Map<string,import('../lib/types.js').XastElement>} idToElement
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 * @param {import('../lib/types.js').XastElement[]} allDefs
 * @param {Set<import('../lib/types.js').XastElement>} clipPaths
 * @param {Map<string,import('../lib/types.js').CSSRule[]>} styleIds
 */
function deleteElementsAndClipPath(
  elementsToDelete,
  idToElement,
  idToReferences,
  allDefs,
  clipPaths,
  styleIds,
) {
  const childrenToDelete = new ChildDeletionQueue();

  let currentElementsToDelete = elementsToDelete;
  while (true) {
    removeElements(currentElementsToDelete, childrenToDelete, idToReferences);

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
          if (hasReferencedChildren(element, element, idToReferences)) {
            convertToDefs(element, allDefs);
          } else {
            nextElementsToDelete.set(element, false);
            idToElement.delete(id);

            // If this element references others, remove this element from the list of references to those ids.
            removeDescendantReferences(element, idToReferences);
          }
        } else if (isDefsChild(element)) {
          if (uselessContainers.has(element.local)) {
            convertToDefs(element, allDefs);
          } else if (element.children.length === 0) {
            nextElementsToDelete.set(element, false);
            idToElement.delete(id);
            // If this element references others, remove this element from the list of references to those ids.
            removeDescendantReferences(element, idToReferences);
          }
        }
      }
    }

    if (nextElementsToDelete.size === 0) {
      break;
    }
    currentElementsToDelete = nextElementsToDelete;
  }

  childrenToDelete.delete();

  // If there are any empty <clipPath> elements, remove them and any element that references them.
  const newElementsToDelete = removeEmptyClipPaths(clipPaths, idToReferences);
  if (newElementsToDelete.size > 0) {
    deleteElementsAndClipPath(
      newElementsToDelete,
      idToElement,
      idToReferences,
      allDefs,
      clipPaths,
      styleIds,
    );
  }
}

/**
 * @param {import('../lib/types.js').XastElement} topElement
 * @param {import('../lib/types.js').XastElement} element
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 * @returns {boolean}
 */
function hasReferencedChildren(topElement, element, idToReferences) {
  for (const child of element.children) {
    if (child.type !== 'element') {
      continue;
    }
    if (hasReferences(topElement, child, idToReferences)) {
      return true;
    }
    if (
      child.children.some(
        (grandchild) =>
          grandchild.type === 'element' &&
          (hasReferencedChildren(topElement, grandchild, idToReferences) ||
            hasReferences(topElement, grandchild, idToReferences)),
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 *
 * @param {import('../lib/types.js').XastElement} topElement
 * @param {import('../lib/types.js').XastElement} element
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 * @returns {boolean}
 */
function hasReferences(topElement, element, idToReferences) {
  const id = element.svgAtts.get('id')?.toString();
  if (id) {
    const references = idToReferences.get(id);
    if (references !== undefined && references.length > 0) {
      return references.some((e) => !isDescendantOf(topElement, e));
    }
  }
  return false;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {boolean}
 */
function isDefsChild(element) {
  return (
    element.parentNode.type === 'element' &&
    element.uri === undefined &&
    element.parentNode.local === 'defs'
  );
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
 */
function mergeDefs(defs) {
  if (defs.length === 0) {
    return;
  }

  const childrenToDelete = new ChildDeletionQueue();
  const mainDefs = defs[0];
  for (let index = 1; index < defs.length; index++) {
    // Move all children into the first <defs>.
    const element = defs[index];
    if (!hasAttributes(element)) {
      element.children.forEach((child) => (child.parentNode = mainDefs));
      mainDefs.children = mainDefs.children.concat(
        element.children.filter(
          (child) =>
            child.type !== 'element' ||
            child.uri !== undefined ||
            child.local !== 'defs',
        ),
      );
      childrenToDelete.add(element);
    }
  }

  childrenToDelete.delete();
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 */
function removeDescendantReferences(element, idToReferences) {
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
      removeDescendantReferences(child, idToReferences);
    }
  });
}

/**
 * @param {Map<import('../lib/types.js').XastElement,boolean>} elementsToDelete
 * @param {ChildDeletionQueue} childrenToDelete
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 */
function removeElements(elementsToDelete, childrenToDelete, idToReferences) {
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
          removeUsingElements(
            referencingElement,
            id,
            childrenToDelete,
            idToReferences,
          );
        }
      }
    }

    if (!hasReferencedChildren(element, element, idToReferences)) {
      // If this element, or any of its children, has references to other elements, remove them.
      removeDescendantReferences(element, idToReferences);
      childrenToDelete.add(element);
    }
  }
}

/**
 * @param {Set<import('../lib/types.js').XastElement>} clipPaths
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 * @returns {Map<import('../lib/types.js').XastElement,boolean>}
 */
function removeEmptyClipPaths(clipPaths, idToReferences) {
  const childrenToDelete = new ChildDeletionQueue();
  /** @type {Map<import('../lib/types.js').XastElement,boolean>} */
  const refsToDelete = new Map();

  for (const clipPath of clipPaths) {
    if (clipPath.children.length > 0) {
      continue;
    }
    childrenToDelete.add(clipPath);
    clipPaths.delete(clipPath);
    const id = clipPath.svgAtts.get('id')?.toString();
    if (id === undefined) {
      continue;
    }

    const refs = idToReferences.get(id);
    if (refs === undefined) {
      continue;
    }

    refs.forEach((ref) => refsToDelete.set(ref, false));
  }

  childrenToDelete.delete();

  return refsToDelete;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').ComputedPropertyMap} properties
 * @param {Map<import('../lib/types.js').XastElement,boolean>} elementsToDelete
 * @returns {boolean}
 */
function removeEmptyShapes(element, properties, elementsToDelete) {
  switch (element.local) {
    case 'circle':
      if (properties.get('r')?.toString() === '0') {
        elementsToDelete.set(element, false);
        return true;
      }
      return false;
    case 'ellipse':
      {
        // Ellipse with zero radius -- https://svgwg.org/svg2-draft/geometry.html#RxProperty
        const props = getEllipseProperties(properties);
        if (props === undefined) {
          return false;
        }
        if (
          element.children.length === 0 &&
          (props.rx === '0' || props.ry === '0')
        ) {
          elementsToDelete.set(element, false);
          return true;
        }
      }
      return false;
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
      if (commands.length === 0) {
        elementsToDelete.set(element, false);
        return true;
      }
      if (commands.length === 1) {
        if (properties.get('marker-end') !== undefined) {
          return false;
        }
        elementsToDelete.set(element, false);
        return true;
      }

      return false;
    }
    case 'rect':
      {
        const width = element.svgAtts.get('width');
        const height = element.svgAtts.get('height');
        // https://svgwg.org/svg2-draft/shapes.html#RectElement
        if (
          element.children.length === 0 &&
          (width === undefined ||
            height === undefined ||
            width.toString() === '0' ||
            height.toString() === '0')
        ) {
          elementsToDelete.set(element, false);
          return true;
        }
      }
      break;
  }
  return false;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} id
 * @param {ChildDeletionQueue} childrenToDelete
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToReferences
 */
function removeUsingElements(element, id, childrenToDelete, idToReferences) {
  if (element.local === 'use') {
    const hrefId = getHrefId(element);
    if (hrefId === id) {
      childrenToDelete.add(element);
      removeDescendantReferences(element, idToReferences);
    }
  }
}
