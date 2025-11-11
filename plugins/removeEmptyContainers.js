import { SIMPLE_SELECTORS } from '../lib/css/styleData.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { getHrefId, hasAttributes } from '../lib/tools-ast.js';

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
        // See if there are empty children.
        if (element.children.length === 0) {
          return;
        }

        /** @type {import('../lib/types.js').ParentList} */
        const childParents = parentList.slice();
        childParents.push({ element: element });

        const childrenToDelete = new Set();
        for (const child of element.children) {
          if (
            child.type !== 'element' ||
            !isEmpty(child, styleData, childParents)
          ) {
            continue;
          }

          childrenToDelete.add(child);
          const id = child.svgAtts.get('id')?.toString();
          if (id) {
            removedIds.add(id);
          }
        }

        if (childrenToDelete.size > 0) {
          element.children = element.children.filter(
            (child) => !childrenToDelete.has(child),
          );
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

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').StyleData} styleData
 * @param {Readonly<import('../lib/types.js').ParentList>} parentList
 * @returns {boolean}
 */
function isEmpty(element, styleData, parentList) {
  // remove only empty non-svg containers
  if (!removableEls.has(element.local) || element.children.length !== 0) {
    return false;
  }
  // empty patterns may contain reusable configuration
  if (element.local === 'pattern' && hasAttributes(element)) {
    return false;
  }
  // The <g> may not have content, but the filter may cause a rectangle
  // to be created and filled with pattern.
  const props = styleData.computeProps(element, parentList);
  if (element.local === 'g' && props.get('filter') !== undefined) {
    return false;
  }
  // empty <mask> hides masked element
  if (element.local === 'mask' && element.svgAtts.get('id') !== undefined) {
    return false;
  }
  const parentNode = element.parentNode;
  if (parentNode.type === 'element' && parentNode.local === 'switch') {
    return false;
  }

  return true;
}
