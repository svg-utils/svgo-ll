import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';

export const name = 'removeDesc';
export const description = 'removes <desc>';

const standardDescs = /^\s*(Created with|Created using)/;

/**
 * Removes <desc>.
 * Removes only standard editors content or empty elements because it can be
 * used for accessibility. Enable parameter 'removeAny' to remove any
 * description.
 *
 * @author Daniel Wabyick
 * @see https://developer.mozilla.org/docs/Web/SVG/Element/desc
 *
 * @type {import('./plugins-types.js').Plugin<'removeDesc'>}
 */
export function fn(info, params) {
  const { removeAny = false } = params;

  const childrenToDelete = new ChildDeletionQueue();

  return {
    element: {
      enter: (element) => {
        if (element.uri === undefined && element.local === 'desc') {
          if (
            removeAny ||
            element.children.length === 0 ||
            (element.children[0].type === 'text' &&
              standardDescs.test(element.children[0].value))
          ) {
            childrenToDelete.add(element);
          }
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
