import {
  addChildToDelete,
  deleteChildren,
  recordReferencedIds,
  updateReferencedId,
} from '../lib/svgo/tools.js';

export const name = 'mergeGradients';
export const description = 'merge identical gradients';

/**
 * @type {import('./plugins-types.js').Plugin<'mergeGradients'>};
 */
export const fn = (root, params, info) => {
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

  /** @type {import('../lib/svgo/tools.js').IdReferenceMap} */
  const referencedIds = new Map();

  /** @type {Map<string,string>} */
  const idMap = new Map();

  return {
    element: {
      enter: (element) => {
        // Record all referenced ids.
        recordReferencedIds(element, referencedIds);

        switch (element.name) {
          case 'linearGradient':
          case 'radialGradient':
            break;
          default:
            return;
        }

        const gradientId = element.attributes.id;
        if (!gradientId) {
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
        const childrenToDelete = new Map();

        // Merge any duplicates.
        for (const duplicate of duplicateGradients) {
          // Update all references.

          addChildToDelete(childrenToDelete, duplicate);
          const dupId = duplicate.attributes.id;
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

        // Delete merged nodes.
        deleteChildren(childrenToDelete);
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
    parts.push(element.name);
    for (const [attName, attVal] of Object.entries(element.attributes)) {
      if (excludeId && attName === 'id') {
        continue;
      }
      parts.push(`${attName}:${attVal}`);
    }
  }

  addParts(element, true);

  for (const child of element.children) {
    if (child.type !== 'element' || child.name !== 'stop') {
      return;
    }
    addParts(child, false);
  }
  return parts.join();
}
