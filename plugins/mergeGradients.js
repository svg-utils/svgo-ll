import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { recordReferencedIds, updateReferencedId } from '../lib/tools-ast.js';

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

  // Map gradient to id.
  /** @type {Map<string,string>} */
  const uniqueGradients = new Map();

  // Map unique gradient id to duplicate elements.
  /** @type {import('../lib/types.js').XastElement[]} */
  const duplicateGradients = [];

  /** @type {import('../lib/tools-ast.js').IdReferenceMap} */
  const referencedIds = new Map();

  /** @type {Map<string,string>} */
  const idMap = new Map();

  return {
    element: {
      enter: (element) => {
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

        const uniqueId = uniqueGradients.get(key);
        if (uniqueId) {
          duplicateGradients.push(element);
          idMap.set(gradientId, uniqueId);
        } else {
          uniqueGradients.set(key, gradientId);
        }
      },
    },
    root: {
      exit: () => {
        const childrenToDelete = new ChildDeletionQueue();

        // Merge any duplicates.
        for (const duplicate of duplicateGradients) {
          // Update all references.

          childrenToDelete.add(duplicate);
          const dupId = duplicate.svgAtts.get('id')?.toString();
          if (dupId === undefined) {
            throw new Error();
          }
          const dupReferencingEls = referencedIds.get(dupId);
          if (!dupReferencingEls) {
            continue;
          }
          for (const dupReferencingEl of dupReferencingEls) {
            updateReferencedId(
              dupReferencingEl.referencingEl,
              dupReferencingEl.referencingAtt,
              dupReferencingEl.uri,
              idMap,
            );
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
    for (const [attName, attVal] of Object.entries(element.attributes).sort(
      (a, b) => a[0].localeCompare(b[0]),
    )) {
      if (excludeId && attName === 'id') {
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
