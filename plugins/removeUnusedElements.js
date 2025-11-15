import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';

export const name = 'removeUnusedElements';
export const description = 'removes unused <defs> and non-displayed elements';

/** @type {import('./plugins-types.js').Plugin<'removeUnusedElements'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    !styleData.hasOnlyFeatures([
      'class-selectors',
      'id-selectors',
      'type-selectors',
      'attribute-selectors',
    ])
  ) {
    return;
  }

  // Record which elements to delete, sorted by parent.
  const childrenToDelete = new ChildDeletionQueue();

  return {
    element: {
      enter: (element, parentList) => {
        if (element.uri !== undefined) {
          return;
        }

        const properties = styleData.computeProps(element, parentList);
        if (!properties) {
          return;
        }

        // Remove any rendering elements which are not visible.
        const display = properties.get('display')?.toString();
        if (
          display === 'none' &&
          // markers with display: none still rendered
          element.local !== 'marker'
        ) {
          childrenToDelete.add(element);
          return;
        }

        const opacity = properties.get('opacity')?.toString();
        // TODO: NEED REFERENCE FOR CLIPPATH CHECK
        if (opacity === '0' && !isInClipPath(element)) {
          childrenToDelete.add(element);
          return;
        }
      },
    },
    root: {
      exit: () => {
        childrenToDelete.delete();
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {boolean}
 */
function isInClipPath(element) {
  let parent = element.parentNode;
  while (parent.type !== 'root') {
    if (parent.uri === undefined && parent.local === 'clipPath') {
      return true;
    }
    parent = parent.parentNode;
  }
  return false;
}
