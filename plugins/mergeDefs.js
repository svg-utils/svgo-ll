import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';

export const name = 'mergeDefs';
export const description =
  'merge multiple <defs> elements into a single element';

/** @type {import('./plugins-types.js').Plugin<'mergeDefs'>} */
export const fn = (info) => {
  if (info.docData.hasScripts()) {
    return;
  }

  /** @type {import('../lib/types.js').XastElement[]} */
  const defs = [];

  return {
    element: {
      enter: (element) => {
        if (element.uri === undefined && element.local === 'defs') {
          defs.push(element);
        }
      },
    },
    root: {
      exit: () => {
        if (defs.length < 2) {
          return;
        }

        const childrenToDelete = new ChildDeletionQueue();

        const mainDefs = defs[0];
        for (let index = 1; index < defs.length; index++) {
          // Move all children into the first <defs>.
          const element = defs[index];
          element.children.forEach((child) => (child.parentNode = mainDefs));
          mainDefs.children = mainDefs.children.concat(element.children);
          childrenToDelete.add(element);
        }

        childrenToDelete.delete();
      },
    },
  };
};
