import { getReferencedIds } from '../lib/svgo/tools.js';
import { visitSkip } from '../lib/xast.js';
import { elemsGroups } from './_collections.js';

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
          return checkedElements.has(nonRenderingEl)
            ? false
            : isReferenced(nonRenderingEl, checkedElements);
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

  return {
    element: {
      enter: (element) => {
        // Record any ids referenced by this element.
        recordReferencedIds(element);

        if (elemsGroups.nonRendering.has(element.name)) {
          addNonRenderedElement(element);
          return visitSkip;
        }
      },
      exit: () => {},
    },
    root: {
      exit: () => {
        // Record which elements to delete, sorted by parent.
        /** @type {Map<import('../lib/types.js').XastParent, Set<import('../lib/types.js').XastChild>>} */
        const childrenToDeleteByParent = new Map();

        for (const element of nonRenderedElements.keys()) {
          if (isReferenced(element)) {
            continue;
          }

          let childrenToDelete = childrenToDeleteByParent.get(
            element.parentNode,
          );
          if (!childrenToDelete) {
            childrenToDelete = new Set();
            childrenToDeleteByParent.set(element.parentNode, childrenToDelete);
          }
          childrenToDelete.add(element);
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
