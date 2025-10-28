import { SIMPLE_SELECTORS } from '../lib/css/styleData.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { getHrefId, hasAttributes } from '../lib/tools-ast.js';
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
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    !styleData.hasOnlyFeatures(SIMPLE_SELECTORS)
  ) {
    return;
  }

  /** @type {Set<string>} */
  const removedIds = new Set();
  /** @type {Map<string, import('../lib/types.js').XastElement[]>} */
  const usesById = new Map();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        if (element.local === 'use') {
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
      exit: (element, parentList) => {
        // remove only empty non-svg containers
        if (!removableEls.has(element.local) || element.children.length !== 0) {
          return;
        }
        // empty patterns may contain reusable configuration
        if (element.local === 'pattern' && hasAttributes(element)) {
          return;
        }
        // The <g> may not have content, but the filter may cause a rectangle
        // to be created and filled with pattern.
        const props = styleData.computeStyle(element, parentList);
        if (element.local === 'g' && props.get('filter') !== undefined) {
          return;
        }
        // empty <mask> hides masked element
        if (
          element.local === 'mask' &&
          element.svgAtts.get('id') !== undefined
        ) {
          return;
        }
        const parentNode = element.parentNode;
        if (parentNode.type === 'element' && parentNode.local === 'switch') {
          return;
        }

        // TODO: Change the way this works so that parent removes empty children. We can't queue them for deletion in
        // root exit; this is running in element exit so that nested empty elements are removed from bottom up, the nesting
        // would be hard to detect in root exit.
        detachNodeFromParent(element);

        const id = element.svgAtts.get('id')?.toString();
        if (id) {
          removedIds.add(id);
        }
      },
    },
    root: {
      exit: () => {
        // Remove any <use> elements that referenced an empty container.

        const childrenToDelete = new ChildDeletionQueue();

        for (const id of removedIds) {
          const usingEls = usesById.get(id);
          if (usingEls) {
            for (const element of usingEls) {
              childrenToDelete.add(element);
            }
          }
        }

        childrenToDelete.delete();
      },
    },
  };
};
