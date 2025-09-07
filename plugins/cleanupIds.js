import { recordReferencedIds, SVGOError } from '../lib/svgo/tools.js';
import { visitSkip } from '../lib/xast.js';
import { elemsGroups } from './_collections.js';

export const name = 'cleanupIds';
export const description = 'removes unused IDs';

/** @type {import('./plugins-types.js').Plugin<'cleanupIds'>} */
export const fn = (info, params) => {
  const { preserve = [], preservePrefixes = [] } = params;

  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  const styleElementIds = styleData.getReferencedIds();

  let disabled = false;

  /** @type {Map<string,import('../lib/types.js').XastElement>} */
  const foundIds = new Map();
  /** @type {import('../lib/svgo/tools.js').IdReferenceMap} */
  const allReferencedIds = new Map();

  const preserveIds = new Set(
    Array.isArray(preserve) ? preserve : preserve ? [preserve] : [],
  );
  const preserveIdPrefixes = Array.isArray(preservePrefixes)
    ? preservePrefixes
    : preservePrefixes
      ? [preservePrefixes]
      : [];

  return {
    element: {
      enter: (element) => {
        if (disabled) {
          return visitSkip;
        }

        if (
          elemsGroups.animation.has(element.name) &&
          element.attributes.begin
        ) {
          // Until we have support for this attribute, disable the plugin.
          disabled = true;
          return visitSkip;
        }

        if (element.attributes.id) {
          if (foundIds.has(element.attributes.id.toString())) {
            throw new SVGOError(`Duplicate id "${element.attributes.id}"`);
          }
          foundIds.set(element.attributes.id.toString(), element);
        }

        recordReferencedIds(element, allReferencedIds);
      },
    },

    root: {
      exit: () => {
        if (disabled) {
          return visitSkip;
        }

        for (const [id, element] of foundIds.entries()) {
          // Delete id attribute if it is not referenced.
          if (allReferencedIds.has(id) || styleElementIds.has(id)) {
            continue;
          } else if (
            !preserveIds.has(id) &&
            !preserveIdPrefixes.some((prefix) => id.startsWith(prefix))
          ) {
            delete element.attributes.id;
          }
        }
      },
    },
  };
};
