export const name = 'removeUnusedNS';
export const description = 'removes unused namespaces declaration';

/**
 * Remove unused namespaces declaration from svg element
 * which are not used in elements or attributes
 *
 * @type {import('./plugins-types.js').Plugin<'removeUnusedNS'>}
 */
export const fn = () => {
  /** @type {Set<string>} */
  const unusedNamespaces = new Set();

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
          for (const name of Object.keys(element.attributes)) {
            if (name.startsWith('xmlns:')) {
              const local = name.slice('xmlns:'.length);
              unusedNamespaces.add(local);
            }
          }
        }
        if (unusedNamespaces.size !== 0) {
          // preserve namespace used in nested elements names
          if (element.name.includes(':')) {
            const [ns] = element.name.split(':');
            if (unusedNamespaces.has(ns)) {
              unusedNamespaces.delete(ns);
            }
          }
          // preserve namespace used in nested elements attributes
          for (const name of Object.keys(element.attributes)) {
            if (name.includes(':')) {
              const [ns] = name.split(':');
              unusedNamespaces.delete(ns);
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
          for (const name of unusedNamespaces) {
            delete element.attributes[`xmlns:${name}`];
          }
        }
      },
    },
  };
};
