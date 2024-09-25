/**
 * @typedef {import('../lib/types.js').XastElement} XastElement
 */

import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';
import {
  generateId,
  getReferencedIds,
  getReferencedIdsInAttribute,
  updateReferencedDeclarationIds,
} from '../lib/svgo/tools.js';
import { visitSkip } from '../lib/xast.js';
import { elemsGroups } from './_collections.js';

export const name = 'cleanupIds';
export const description = 'removes unused IDs and minifies used';

/**
 * @param {XastElement} element
 * @param {string} attName
 * @param {Map<string,string>} idMap
 */
function updateReferencedId(element, attName, idMap) {
  if (attName === 'style') {
    updateReferencedStyleId(element, idMap);
    return;
  }

  const attValue = element.attributes[attName];
  const ids = getReferencedIdsInAttribute(attName, attValue);
  if (ids.length !== 1) {
    throw new Error();
  }
  const newId = idMap.get(ids[0].id);
  if (newId === undefined) {
    throw new Error();
  }
  element.attributes[attName] = attValue.replace(
    '#' + ids[0].literalString,
    '#' + newId,
  );
}

/**
 * @param {XastElement} element
 * @param {Map<string,string>} idMap
 */
function updateReferencedStyleId(element, idMap) {
  const decls = getStyleDeclarations(element);
  if (decls === undefined) {
    throw new Error();
  }
  updateReferencedDeclarationIds(decls, idMap);
  writeStyleAttribute(element, decls);
}

/**
 * Remove unused and minify used IDs
 *
 * @type {import('./plugins-types.js').Plugin<'cleanupIds'>}
 */
export const fn = (_root, params, info) => {
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

    // Sort by size, then alpha.
    originalIds = originalIds.sort((a, b) =>
      a.length === b.length ? a.localeCompare(b) : a.length - b.length,
    );

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

  /** @type {Map<string,XastElement>} */
  const foundIds = new Map();
  /** @type {Map<string,{referencingEl:XastElement,referencingAtt:string}[]>} */
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
          foundIds.set(element.attributes.id, element);
        }

        const referencedIds = getReferencedIds(element);
        for (const { id, attName } of referencedIds) {
          let references = allReferencedIds.get(id);
          if (!references) {
            references = [];
            allReferencedIds.set(id, references);
          }
          references.push({ referencingEl: element, referencingAtt: attName });
        }
      },
    },

    root: {
      exit: () => {
        if (disabled) {
          return visitSkip;
        }

        /** @type {string[]} */
        const referencedIds = [];

        for (const [id, element] of foundIds.entries()) {
          // Delete id attribute if it is not referenced.
          if (allReferencedIds.has(id) || styleElementIds.has(id)) {
            referencedIds.push(id);
          } else if (
            !preserveIds.has(id) &&
            !preserveIdPrefixes.some((prefix) => id.startsWith(prefix))
          ) {
            delete element.attributes.id;
          }
        }

        // Remap the referenced ids to shorter versions where possible.
        const idMap = generateIdMap(referencedIds);

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
