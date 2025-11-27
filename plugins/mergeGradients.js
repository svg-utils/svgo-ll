import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { addToMapArray } from '../lib/svgo/tools.js';
import {
  getHrefId,
  recordReferencedIds,
  updateReferencedId,
} from '../lib/tools-ast.js';

export const name = 'mergeGradients';
export const description = 'merge identical gradients';

/**
 * @type {import('./plugins-types.js').Plugin<'mergeGradients'>};
 */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const identicalGradients = new Map();

  /** @type {import('../lib/tools-ast.js').IdReferenceMap} */
  const referencedIds = new Map();

  /** @type {Map<string,string>} */
  const idMap = new Map();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        // Record all referenced ids.
        recordReferencedIds(element, referencedIds);

        switch (element.local) {
          case 'linearGradient':
          case 'radialGradient':
            break;
          default:
            return;
        }

        const gradientId = element.svgAtts.get('id')?.toString();
        if (!gradientId) {
          return;
        }

        if (styleData.hasIdSelector(gradientId)) {
          // Don't merge gradients that are referenced by a selector.
          return;
        }

        const key = getGradientKey(element);
        if (!key) {
          return;
        }

        addToMapArray(identicalGradients, key, element);
      },
    },
    root: {
      exit: () => {
        const childrenToDelete = new ChildDeletionQueue();

        // Merge any duplicates.
        for (const duplicates of identicalGradients.values()) {
          if (duplicates.length < 2) {
            continue;
          }

          const newId = duplicates[0].svgAtts.get('id')?.toString();
          if (newId === undefined) {
            throw new Error();
          }

          for (let index = 1; index < duplicates.length; index++) {
            const duplicate = duplicates[index];

            // Update all references.
            childrenToDelete.add(duplicate);
            const dupId = duplicate.svgAtts.get('id')?.toString();
            if (dupId === undefined) {
              throw new Error();
            }

            idMap.set(dupId, newId);
            const dupReferencingEls = referencedIds.get(dupId);
            if (!dupReferencingEls) {
              continue;
            }
            for (const dupReferencingEl of dupReferencingEls) {
              updateReferencedId(
                dupReferencingEl.referencingEl,
                dupReferencingEl.referencingAtt,
                idMap,
              );
            }
          }
        }

        // Update any ids referenced by <style> properties.
        styleData.updateReferencedIds(styleData.getReferencedIds(), idMap);

        // Delete merged nodes.
        childrenToDelete.delete();
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {string|undefined}
 */
function getGradientKey(element) {
  /** @type {string[]} */
  const parts = [];

  /**
   * @param {import('../lib/types.js').XastElement} element
   * @param {boolean} excludeId
   */
  function addParts(element, excludeId) {
    parts.push(element.local);

    // Get href separately to account for xlink:href.
    const hrefId = getHrefId(element);
    if (hrefId) {
      parts.push(`href:${hrefId}`);
    }

    const array = Array.from(element.svgAtts.entries());
    for (const [attName, attVal] of array.sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      switch (attName) {
        case 'id':
          if (excludeId) {
            continue;
          }
          break;
        case 'href':
          // Handled above.
          continue;
      }
      parts.push(`${attName}:${attVal}`);
    }
  }

  addParts(element, true);

  for (const child of element.children) {
    if (child.type !== 'element' || child.local !== 'stop') {
      return;
    }
    addParts(child, false);
  }
  return parts.join();
}
