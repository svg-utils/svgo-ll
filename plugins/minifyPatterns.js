import { addToMapArray } from '../lib/svgo/tools.js';
import { getHrefId, getReferencedIds2 } from '../lib/tools-ast.js';

export const name = 'minifyPatterns';
export const description =
  'merge pattern elements and remove unused attributes';

/** @type {Set<string>} */
const PATTERN_ATTS_OVERRIDE = new Set([
  'height',
  'patternContentUnits',
  'patternTransform',
  'patternUnits',
  'preserveAspectRatio',
  'viewBox',
  'width',
  'x',
  'y',
]);

/** @type {import('./plugins-types.js').Plugin<'minifyPatterns'>}; */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  /** @type {Map<string,import('../lib/types.js').XastElement>} */
  const patternsById = new Map();

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const templateReferencesById = new Map();

  /** @type {Map<string,import('../types/types.js').ReferenceInfo[]>} */
  const paintReferencesById = new Map();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        switch (element.local) {
          case 'pattern':
            {
              const id = element.svgAtts.get('id')?.toString();
              if (id !== undefined) {
                patternsById.set(id, element);
              }
              const hrefId = getHrefId(element);
              if (hrefId !== undefined) {
                addToMapArray(templateReferencesById, hrefId, element);
              }
            }
            break;
          default: {
            const refs = getReferencedIds2(element);
            refs.forEach((ref) => {
              if (ref.name === 'fill' || ref.name === 'stroke') {
                addToMapArray(paintReferencesById, ref.id, ref);
              }
            });
          }
        }
      },
    },
    root: {
      exit: () => {
        // Check to see if templates can be collapsed.
        for (const [patternId, references] of templateReferencesById) {
          if (references.length !== 1) {
            continue;
          }

          const referencingEl = references[0];
          if (referencingEl.local !== 'pattern') {
            continue;
          }

          const template = patternsById.get(patternId);
          if (template === undefined) {
            continue;
          }

          // There is only a single reference, from another pattern - merge them.

          for (const [attName, attValue] of referencingEl.svgAtts.entries()) {
            // Overwrite the template attributes with referencing attributes.
            if (PATTERN_ATTS_OVERRIDE.has(attName)) {
              template.svgAtts.set(attName, attValue);
            }
          }
        }
      },
    },
  };
};
