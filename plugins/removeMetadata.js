import { detachNodeFromParent } from '../lib/xast.js';

export const name = 'removeMetadata';
export const description = 'removes <metadata>';

/**
 * Remove <metadata>.
 *
 * https://www.w3.org/TR/SVG11/metadata.html
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types.js').Plugin<'removeMetadata'>}
 */
export function fn(root, params, info) {
  if (info.passNumber > 0) {
    return;
  }
  return {
    element: {
      enter: (node) => {
        if (node.name === 'metadata') {
          detachNodeFromParent(node);
        }
      },
    },
  };
}
