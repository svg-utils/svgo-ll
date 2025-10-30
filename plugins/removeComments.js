import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';

export const name = 'removeComments';
export const description = 'removes comments';

/**
 * If a comment matches one of the following patterns, it will be
 * preserved by default. Particularly for copyright/license information.
 */
const DEFAULT_PRESERVE_PATTERNS = [/^!/];

/**
 * Remove comments.
 *
 * @example
 * <!-- Generator: Adobe Illustrator 15.0.0, SVG Export
 * Plug-In . SVG Version: 6.00 Build 0)  -->
 *
 * @type {import('./plugins-types.js').Plugin<'removeComments'>}
 */
export const fn = (info, params) => {
  const { preservePatterns = DEFAULT_PRESERVE_PATTERNS } = params;
  if (preservePatterns && !Array.isArray(preservePatterns)) {
    throw Error(
      `Expected array in removeComments preservePatterns parameter but received ${preservePatterns}`,
    );
  }

  const childrenToDelete = new ChildDeletionQueue();

  return {
    comment: {
      enter: (comment) => {
        if (preservePatterns) {
          const matches = preservePatterns.some((pattern) => {
            return new RegExp(pattern).test(comment.value);
          });

          if (matches) {
            return;
          }
        }

        childrenToDelete.add(comment);
      },
    },
    root: {
      exit: () => {
        childrenToDelete.delete();
      },
    },
  };
};
