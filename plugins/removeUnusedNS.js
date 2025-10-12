import { deleteOtherAtt, getOtherAtts, NS_SVG } from '../lib/tools-ast.js';

export const name = 'removeUnusedNS';
export const description = 'removes unused namespaces declaration';

/**
 * Remove unused namespaces declaration from svg element
 * which are not used in elements or attributes
 *
 * @type {import('./plugins-types.js').Plugin<'removeUnusedNS'>}
 */
export const fn = () => {
  /** @type {Map<string,string>} */
  const unusedPrefixes = new Map();

  return {
    element: {
      enter: (element) => {
        const parentNode = element.parentNode;
        // collect all namespaces from svg element
        // (such as xmlns:xlink="http://www.w3.org/1999/xlink")
        if (
          element.local === 'svg' &&
          element.uri === undefined &&
          parentNode.type === 'root'
        ) {
          for (const att of getOtherAtts(element)) {
            if (att.prefix === 'xmlns' && att.value !== NS_SVG) {
              unusedPrefixes.set(att.local, att.value);
            }
          }
        }
        if (unusedPrefixes.size !== 0) {
          // preserve namespace used in nested elements names
          if (
            element.prefix &&
            element.uri === unusedPrefixes.get(element.prefix)
          ) {
            unusedPrefixes.delete(element.prefix);
          }
          // preserve namespace used in nested elements attributes
          for (const att of getOtherAtts(element)) {
            if (
              att.prefix !== undefined &&
              att.uri === unusedPrefixes.get(att.prefix)
            ) {
              unusedPrefixes.delete(att.prefix);
            }
          }
        }
      },
      exit: (element) => {
        // remove unused namespace attributes from svg element
        if (
          element.local === 'svg' &&
          element.uri === undefined &&
          element.parentNode.type === 'root'
        ) {
          for (const prefix of unusedPrefixes.keys()) {
            deleteNamespaceAtt(element, prefix);
          }
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} prefix
 */
function deleteNamespaceAtt(element, prefix) {
  for (const att of getOtherAtts(element)) {
    if (att.prefix === 'xmlns' && att.local === prefix) {
      deleteOtherAtt(element, att);
      return;
    }
  }
}
