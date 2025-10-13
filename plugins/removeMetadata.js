import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';

export const name = 'removeMetadata';
export const description = 'removes <metadata>';

/**
 * Remove <metadata>.
 *
 * https://www.w3.org/TR/SVG11/metadata.html
 *
 * @type {import('./plugins-types.js').Plugin<'removeMetadata'>}
 */
export function fn() {
  const childrenToDelete = new ChildDeletionQueue();
  return {
    element: {
      enter: (element) => {
        if (element.uri === undefined && element.local === 'metadata') {
          childrenToDelete.add(element);
        }
      },
    },
    root: {
      exit: () => {
        childrenToDelete.delete();
      },
    },
  };
}
