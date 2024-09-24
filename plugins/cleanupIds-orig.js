import { visitSkip } from '../lib/xast.js';
import { findReferences } from '../lib/svgo/tools.js';

/**
 * @typedef {import('../lib/types.js').XastElement} XastElement
 */

export const name = 'cleanupIds';
export const description = 'removes unused IDs and minifies used';

const generateIdChars = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];
const maxIdIndex = generateIdChars.length - 1;

/**
 * Check if an ID starts with any one of a list of strings.
 *
 * @type {(string: string, prefixes: string[]) => boolean}
 */
const hasStringPrefix = (string, prefixes) => {
  for (const prefix of prefixes) {
    if (string.startsWith(prefix)) {
      return true;
    }
  }
  return false;
};

/**
 * Generate unique minimal ID.
 *
 * @param {?number[]} currentId
 * @returns {number[]}
 */
const generateId = (currentId) => {
  if (currentId == null) {
    return [0];
  }
  currentId[currentId.length - 1] += 1;
  for (let i = currentId.length - 1; i > 0; i--) {
    if (currentId[i] > maxIdIndex) {
      currentId[i] = 0;
      if (currentId[i - 1] !== undefined) {
        currentId[i - 1]++;
      }
    }
  }
  if (currentId[0] > maxIdIndex) {
    currentId[0] = 0;
    currentId.unshift(0);
  }
  return currentId;
};

/**
 * Get string from generated ID array.
 *
 * @type {(arr: number[]) => string}
 */
const getIdString = (arr) => {
  return arr.map((i) => generateIdChars[i]).join('');
};

/**
 * @param {string} value
 * @param {string} oldId
 * @param {string} newId
 */
export function replaceIdInAttributeValue(value, oldId, newId) {
  const newValue = value.replace(`#${oldId}`, `#${newId}`);
  // If the value hasn't changed, it may be URL encoded; try replacing the URL encoded value.
  return newValue !== value
    ? newValue
    : value.replace(`#${encodeURI(oldId)}`, `#${newId}`);
}

/**
 * Remove unused and minify used IDs
 * (only if there are no any <style> or <script>).
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types.js').Plugin<'cleanupIds'>}
 */
export const fn = (_root, params, info) => {
  const {
    remove = true,
    minify = true,
    preserve = [],
    preservePrefixes = [],
    force = false,
  } = params;

  const styleData = info.docData.getStyles();
  if (
    !force &&
    (info.docData.hasScripts() || styleData === null || styleData.hasStyles())
  ) {
    return;
  }

  const preserveIds = new Set(
    Array.isArray(preserve) ? preserve : preserve ? [preserve] : [],
  );
  const preserveIdPrefixes = Array.isArray(preservePrefixes)
    ? preservePrefixes
    : preservePrefixes
      ? [preservePrefixes]
      : [];
  /**
   * @type {Map<string, XastElement>}
   */
  const nodeById = new Map();
  /**
   * @type {Map<string, {element: XastElement, name: string }[]>}
   */
  const referencesById = new Map();

  function generateIdMap() {
    /**
     * @param {string} id
     * @returns {boolean}
     */
    const isIdPreserved = (id) =>
      preserveIds.has(id) || hasStringPrefix(id, preserveIdPrefixes);
    const idMap = new Map();
    let currentId = null;
    for (const [id] of referencesById) {
      const node = nodeById.get(id);
      if (node != null) {
        // replace referenced IDs with the minified ones
        if (minify && isIdPreserved(id) === false) {
          /** @type {?string} */
          let currentIdString = null;
          do {
            currentId = generateId(currentId);
            currentIdString = getIdString(currentId);
          } while (
            isIdPreserved(currentIdString) ||
            (referencesById.has(currentIdString) &&
              nodeById.get(currentIdString) == null)
          );
          idMap.set(id, currentIdString);
        }
      }
    }
    return idMap;
  }

  return {
    element: {
      enter: (node) => {
        if (!force) {
          // avoid removing IDs if the whole SVG consists only of defs
          if (node.name === 'svg') {
            let hasDefsOnly = true;
            for (const child of node.children) {
              if (child.type !== 'element' || child.name !== 'defs') {
                hasDefsOnly = false;
                break;
              }
            }
            if (hasDefsOnly) {
              return visitSkip;
            }
          }
        }

        for (const [name, value] of Object.entries(node.attributes)) {
          if (name === 'id') {
            // collect all ids
            const id = value;
            if (nodeById.has(id)) {
              delete node.attributes.id; // remove repeated id
            } else {
              nodeById.set(id, node);
            }
          } else {
            const ids = findReferences(name, value);
            for (const id of ids) {
              let refs = referencesById.get(id);
              if (refs == null) {
                refs = [];
                referencesById.set(id, refs);
              }
              refs.push({ element: node, name });
            }
          }
        }
      },
    },

    root: {
      exit: () => {
        /**
         * @param {string} id
         * @returns {boolean}
         */
        const isIdPreserved = (id) =>
          preserveIds.has(id) || hasStringPrefix(id, preserveIdPrefixes);

        const idMap = generateIdMap();
        const elementssWithStylesUpdated = new Set();

        for (const [id, refs] of referencesById) {
          // Ignore the node if no new ID was generated for it.
          if (!idMap.has(id)) {
            continue;
          }
          const node = nodeById.get(id);
          if (!node) {
            continue;
          }

          // replace referenced IDs with the minified ones
          const currentIdString = idMap.get(id);
          node.attributes.id = currentIdString;

          for (const { element, name } of refs) {
            const value = element.attributes[name];
            if (value.includes('#')) {
              if (name === 'style') {
                if (!elementssWithStylesUpdated.has(element)) {
                  // The style may have more than one ID; all must be replaced at once to eliminate the possibility of overlap.
                  const styles = value.split(';');
                  for (let index = 0; index < styles.length; index++) {
                    const style = styles[index];
                    const refs = findReferences('style', style);
                    if (refs.length) {
                      const id = refs[0];
                      const newId = idMap.get(id);
                      if (newId) {
                        styles[index] = replaceIdInAttributeValue(
                          style,
                          id,
                          newId,
                        );
                      }
                    }
                  }
                  element.attributes[name] = styles.join(';');
                  elementssWithStylesUpdated.add(element);
                }
              } else {
                // replace id in href and url()
                element.attributes[name] = replaceIdInAttributeValue(
                  value,
                  id,
                  currentIdString,
                );
              }
            } else {
              // replace id in begin attribute
              element.attributes[name] = value.replace(
                `${id}.`,
                `${currentIdString}.`,
              );
            }
          }

          // keep referenced node
          nodeById.delete(id);
        }
        // remove non-referenced IDs attributes from elements
        if (remove) {
          for (const [id, node] of nodeById) {
            if (isIdPreserved(id) === false) {
              delete node.attributes.id;
            }
          }
        }
      },
    },
  };
};
