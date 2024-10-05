import { getReferencedIds } from '../lib/svgo/tools.js';
import { visitSkip } from '../lib/xast.js';
import { elemsGroups } from './_collections.js';
import { parsePathCommands } from './minifyPathData.js';

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

  /** Associate children of non-rendering elements with the top-level element. */
  /** @type {Map<import('../lib/types.js').XastElement,import('../lib/types.js').XastElement>} */
  const nonRenderingChildren = new Map();

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
   * @param {import('../lib/types.js').XastElement} topElement
   */
  function addNonRenderedElement(topElement) {
    /**
     * @param {import('../lib/types.js').XastElement} element
     */
    function processElement(element) {
      // If the element is an empty shape, remove it and don't process any children.
      if (removeEmptyShapes(element)) {
        return;
      }

      if (element.attributes.id) {
        ids.add(element.attributes.id);
      }
      if (recordReferencedIds(element)) {
        nonRenderingChildren.set(element, topElement);
      }
      for (const child of element.children) {
        if (child.type === 'element') {
          processElement(child);
        }
      }
    }

    const ids = new Set();
    processElement(topElement);
    nonRenderedElements.set(topElement, ids);
  }

  /**
   * @param {import('../lib/types.js').XastElement} topElement
   * @param {Set<import('../lib/types.js').XastElement>} [checkedElements]
   * @returns {boolean}
   */
  function isReferenced(topElement, checkedElements) {
    const idsInNonRenderedBranch = nonRenderedElements.get(topElement);
    if (!idsInNonRenderedBranch) {
      throw new Error();
    }
    for (const id of idsInNonRenderedBranch) {
      const referencingEls = referencedIds.get(id);
      if (referencingEls) {
        // See if any of the referencing nodes are referenced.
        for (const el of referencingEls) {
          if (el === undefined) {
            // Referenced in a <style> element.
            return true;
          }
          const nonRenderingEl = nonRenderingChildren.get(el);
          if (nonRenderingEl === undefined) {
            // Referenced by a rendering element.
            return true;
          }
          // Otherwise see if the non-rendering element that references this one is referenced. Keep track of which ones have
          // been checked to avoid loops.
          if (!checkedElements) {
            checkedElements = new Set();
          }
          checkedElements.add(topElement);
          if (checkedElements.has(nonRenderingEl)) {
            continue;
          }
          if (isReferenced(nonRenderingEl, checkedElements)) {
            return true;
          }
        }
      }
    }
    return false;
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
   * @returns {boolean}
   */
  function removeEmptyShapes(element) {
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
        const commands = parsePathCommands(element.attributes.d, 2);
        if (commands.length < 2) {
          removeElement(element);
          return true;
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
          // Any children of <defs> are hidden, regardless of whether they are non-rendering.
          for (const child of element.children) {
            if (child.type === 'element') {
              if (child.name === 'style') {
                continue;
              }
              addNonRenderedElement(child);
            }
          }
          return visitSkip;
        }

        // Process non-rendering elements outside of a <defs>.
        if (elemsGroups.nonRendering.has(element.name)) {
          addNonRenderedElement(element);
          return visitSkip;
        }

        if (removeEmptyShapes(element)) {
          return;
        }

        // Remove any rendering elements which are not visible.

        const properties = styleData.computeStyle(element, parentInfo);
        if (!properties) {
          return;
        }

        const display = properties.get('display');
        if (
          display === 'none' &&
          // markers with display: none still rendered
          element.name !== 'marker'
        ) {
          removeElement(element);
          return;
        }

        const opacity = properties.get('opacity');
        if (opacity === '0') {
          if (element.name === 'path') {
            // It's possible this will be referenced in a <textPath>; treat it as a non-rendered element.
            addNonRenderedElement(element);
          } else {
            removeElement(element);
            return;
          }
        }
      },
      exit: () => {},
    },
    root: {
      exit: () => {
        for (const element of nonRenderedElements.keys()) {
          if (isReferenced(element)) {
            continue;
          }

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
