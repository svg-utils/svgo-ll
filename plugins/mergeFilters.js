import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { addToMapArray } from '../lib/svgo/tools.js';
import { recordReferencedIds, updateReferencedId } from '../lib/tools-ast.js';
import { visitSkip } from '../lib/xast.js';

export const name = 'mergeFilters';
export const description = 'merge identical filters';

/** @type {import('./plugins-types.js').Plugin<'mergeFilters'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const uniqueFilters = new Map();

  /** @type {import('../lib/tools-ast.js').IdReferenceMap} */
  const referencedIds = new Map();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        // Record all referenced ids.
        recordReferencedIds(element, referencedIds);

        if (element.local !== 'filter') {
          return;
        }

        const key = getFilterKey(element);
        addToMapArray(uniqueFilters, key, element);

        return visitSkip;
      },
    },
    root: {
      exit: () => {
        const childrenToDelete = new ChildDeletionQueue();

        /** @type {Map<string,string>} */
        const idMap = new Map();

        for (const filters of uniqueFilters.values()) {
          if (filters.length < 2) {
            continue;
          }

          const targetId = filters[0].svgAtts.get('id')?.toString();
          if (targetId === undefined) {
            throw new Error();
          }

          for (let index = 1; index < filters.length; index++) {
            const filter = filters[index];
            childrenToDelete.add(filter);
            const sourceId = filter.svgAtts.get('id')?.toString();
            if (sourceId === undefined) {
              throw new Error();
            }
            idMap.set(sourceId, targetId);
          }
        }

        childrenToDelete.delete();

        for (const source of idMap.keys()) {
          const referencingEls = referencedIds.get(source);
          if (referencingEls === undefined) {
            continue;
          }
          for (const dupReferencingEl of referencingEls) {
            updateReferencedId(
              dupReferencingEl.referencingEl,
              dupReferencingEl.referencingAtt,
              idMap,
            );
          }
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {Array<string>}
 */
function getAttributeKey(element) {
  /** @type {string[]} */
  const attStrs = [];
  for (const [k, v] of element.svgAtts.entries()) {
    if (k === 'id' && element.local === 'filter') {
      continue;
    }
    attStrs.push(`${k}="${v}"`);
  }
  return attStrs.sort();
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {Array<{}>}
 */
function getChildKey(element) {
  /** @type {string[]} */
  const childstrs = [];
  for (const child of element.children) {
    if (child.type === 'element') {
      childstrs.push(getFilterKey(child));
    }
  }
  return childstrs;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {string}
 */
function getFilterKey(element) {
  /** @type {{n:string,a:Array<string>,c:Array<{}>}} */
  const obj = {
    n: element.local,
    a: getAttributeKey(element),
    c: getChildKey(element),
  };
  return JSON.stringify(obj);
}
