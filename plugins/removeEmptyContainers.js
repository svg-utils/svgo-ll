import {
  addChildToDelete,
  deleteChildren,
  getHrefId,
} from '../lib/svgo/tools.js';
import { detachNodeFromParent } from '../lib/xast.js';

export const name = 'removeEmptyContainers';
export const description = 'removes empty container elements';

const removableEls = new Set([
  'a',
  'defs',
  'foreignObject',
  'g',
  'marker',
  'mask',
  'missing-glyph',
  'pattern',
  'switch',
  'symbol',
  'text',
  'tspan',
]);

/**
 * Remove empty containers and text elements.
 *
 * @see https://www.w3.org/TR/SVG11/intro.html#TermContainerElement
 *
 * @type {import('./plugins-types.js').Plugin<'removeEmptyContainers'>}
 */
export const fn = () => {
  const removedIds = new Set();
  /** @type {Map<string, import('../lib/types.js').XastElement[]>} */
  const usesById = new Map();

  return {
    element: {
      enter: (element) => {
        if (element.name === 'use') {
          // Record uses so those referencing empty containers can be removed.
          const id = getHrefId(element);
          if (id) {
            let references = usesById.get(id);
            if (references === undefined) {
              references = [];
              usesById.set(id, references);
            }
            references.push(element);
          }
        }
      },
      exit: (element, parentNode) => {
        // remove only empty non-svg containers
        if (!removableEls.has(element.name) || element.children.length !== 0) {
          return;
        }
        // empty patterns may contain reusable configuration
        if (
          element.name === 'pattern' &&
          Object.keys(element.attributes).length !== 0
        ) {
          return;
        }
        // The <g> may not have content, but the filter may cause a rectangle
        // to be created and filled with pattern.
        if (element.name === 'g' && element.attributes.filter != null) {
          return;
        }
        // empty <mask> hides masked element
        if (element.name === 'mask' && element.attributes.id != null) {
          return;
        }
        if (parentNode.type === 'element' && parentNode.name === 'switch') {
          return;
        }

        // TODO: Change the way this works so that parent removes empty children. We can't queue them for deletion in
        // root exit; this is running in element exit so that nested empty elements are removed from bottom up, the nesting
        // would be hard to detect in root exit.
        detachNodeFromParent(element, parentNode);
        if (element.attributes.id) {
          removedIds.add(element.attributes.id);
        }
      },
    },
    root: {
      exit: () => {
        // Remove any <use> elements that referenced an empty container.

        /** @type {Map<import('../lib/types.js').XastParent,Set<import('../lib/types.js').XastChild>>} */
        const childrenToDelete = new Map();

        for (const id of removedIds) {
          const usingEls = usesById.get(id);
          if (usingEls) {
            for (const element of usingEls) {
              addChildToDelete(childrenToDelete, element);
            }
          }
        }

        deleteChildren(childrenToDelete);
      },
    },
  };
};
