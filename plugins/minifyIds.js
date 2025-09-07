import {
  generateId,
  recordReferencedIds,
  SVGOError,
  updateReferencedId,
} from '../lib/svgo/tools.js';
import { visitSkip } from '../lib/xast.js';
import { elemsGroups } from './_collections.js';

export const name = 'minifyIds';
export const description = 'minifies id attribute values';

/** @type {import('./plugins-types.js').Plugin<'minifyIds'>} */
export const fn = (info, params) => {
  const { preserve = [], preservePrefixes = [] } = params;

  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  const styleElementIds = styleData.getReferencedIds();

  let disabled = false;

  /**
   * @param {string[]} originalIds
   * @returns {Map<string,string>}
   */
  function generateIdMap(originalIds) {
    function getNextId() {
      if (!nextId) {
        do {
          nextId = generateId(counter++);
        } while (
          currentIds.has(nextId) ||
          allReferencedIds.has(nextId) ||
          // @ts-ignore - nextId is defined
          preserveIdPrefixes.some((prefix) => nextId.startsWith(prefix)) ||
          preserveIds.has(nextId)
        );
      }
      return nextId;
    }
    let counter = 1;
    /** @type {string|undefined} */
    let nextId;

    /** @type {Map<string,string>} */
    const idMap = new Map();

    // Sort by number of references, thensize, then alpha.
    originalIds = originalIds.sort((a, b) => {
      const aRefs = allReferencedIds.get(a);
      const bRefs = allReferencedIds.get(b);
      const r = (bRefs ? bRefs.length : 0) - (aRefs ? aRefs.length : 0);
      if (r !== 0) {
        return r;
      }
      return a.length === b.length ? a.localeCompare(b) : a.length - b.length;
    });

    /** @type {Set<string>} */
    const currentIds = new Set(originalIds);

    for (const id of originalIds) {
      if (
        preserveIdPrefixes.some((prefix) => id.startsWith(prefix)) ||
        preserveIds.has(id)
      ) {
        // Don't change if it is supposed to be preserved.
        continue;
      }
      const newId = getNextId();
      if (newId.length >= id.length) {
        // Don't change id if is not smaller.
        continue;
      }
      idMap.set(id, newId);
      nextId = undefined;
    }

    return idMap;
  }

  /** @type {Map<string,import('../lib/types.js').XastElement>} */
  const foundIds = new Map();
  /** @type {import('../lib/svgo/tools.js').IdReferenceMap} */
  const allReferencedIds = new Map();

  const preserveIds = new Set(
    Array.isArray(preserve) ? preserve : preserve ? [preserve] : [],
  );
  const preserveIdPrefixes = Array.isArray(preservePrefixes)
    ? preservePrefixes
    : preservePrefixes
      ? [preservePrefixes]
      : [];

  return {
    element: {
      enter: (element) => {
        if (disabled) {
          return visitSkip;
        }

        if (
          elemsGroups.animation.has(element.name) &&
          element.attributes.begin
        ) {
          // Until we have support for this attribute, disable the plugin.
          disabled = true;
          return visitSkip;
        }

        if (element.attributes.id) {
          if (foundIds.has(element.attributes.id.toString())) {
            throw new SVGOError(`Duplicate id "${element.attributes.id}"`);
          }
          foundIds.set(element.attributes.id.toString(), element);
        }

        recordReferencedIds(element, allReferencedIds);
      },
    },

    root: {
      exit: () => {
        if (disabled) {
          return visitSkip;
        }

        // Remap the referenced ids to shorter versions where possible.
        const idMap = generateIdMap(Array.from(foundIds.keys()));

        // Update all id elements.
        for (const [oldId, newId] of idMap.entries()) {
          const element = foundIds.get(oldId);
          if (!element) {
            throw new Error();
          }
          element.attributes.id = newId;
        }

        // Update all referenced ids.
        for (const [id, references] of allReferencedIds.entries()) {
          if (!idMap.has(id)) {
            continue;
          }
          for (const reference of references) {
            updateReferencedId(
              reference.referencingEl,
              reference.referencingAtt,
              idMap,
            );
          }
        }

        styleData.updateReferencedIds(styleElementIds, idMap);
      },
    },
  };
};
