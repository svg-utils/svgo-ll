import { detachNodeFromParent } from '../lib/xast.js';
import { elemsGroups } from './_collections.js';

/**
 * @typedef {import('../lib/types.js').XastElement} XastElement
 */

export const name = 'removeUselessDefs';
export const description = 'removes elements in <defs> without id';

let deprecationWarning = true;

/**
 * Removes content of defs and properties that aren't rendered directly without ids.
 *
 * @author Lev Solntsev
 *
 * @type {import('./plugins-types.js').Plugin<'removeUselessDefs'>}
 * @deprecated
 */
export const fn = () => {
  if (deprecationWarning) {
    console.warn(
      'The removeUselessDefs plugin is deprecated and will be removed in a future release.',
    );
    deprecationWarning = false;
  }
  return {
    element: {
      enter: (node, parentNode) => {
        if (
          node.name === 'defs' ||
          (elemsGroups.nonRendering.has(node.name) &&
            node.attributes.id == null)
        ) {
          /**
           * @type {XastElement[]}
           */
          const usefulNodes = [];
          collectUsefulNodes(node, usefulNodes);
          if (usefulNodes.length === 0) {
            detachNodeFromParent(node, parentNode);
          }
          for (const usefulNode of usefulNodes) {
            usefulNode.parentNode = node;
          }
          node.children = usefulNodes;
        }
      },
    },
  };
};

/**
 * @type {(node: XastElement, usefulNodes: XastElement[]) => void}
 */
const collectUsefulNodes = (node, usefulNodes) => {
  for (const child of node.children) {
    if (child.type === 'element') {
      if (child.attributes.id != null || child.name === 'style') {
        usefulNodes.push(child);
      } else {
        collectUsefulNodes(child, usefulNodes);
      }
    }
  }
};
