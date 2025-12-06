import { addToMapArray } from '../lib/svgo/tools.js';
import { getHrefId, getReferencedIds2 } from '../lib/tools-ast.js';
import {
  GRADIENT_NAMES,
  LINEAR_GRADIENT_ATTS,
  RADIAL_GRADIENT_ATTS,
} from '../lib/utils/tools-gradient.js';

export const name = 'moveGradientAttsToTemplate';
export const description = 'convert to objectBoundingBox where possible';

/** @type {import('./plugins-types.js').Plugin<'moveGradientAttsToTemplate'>}; */
export const fn = (info) => {
  if (info.docData.hasScripts()) {
    return;
  }

  /** @type {{id:string,gradient:import('../lib/types.js').XastElement}[]} */
  const templateGradients = [];

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const idToTemplateRefs = new Map();

  /** @type {Set<string>} */
  const idsReferencedByNonGradients = new Set();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        if (GRADIENT_NAMES.has(element.local)) {
          const id = element.svgAtts.get('id')?.toString();
          if (id === undefined) {
            return;
          }

          const referencedId = getHrefId(element);
          if (referencedId !== undefined) {
            addToMapArray(idToTemplateRefs, referencedId, element);
          } else {
            templateGradients.push({ id: id, gradient: element });
          }
          return;
        }

        // Record references by non-gradient elements.
        const refs = getReferencedIds2(element);
        for (const ref of refs) {
          idsReferencedByNonGradients.add(ref.id);
        }
      },
    },
    root: {
      exit: () => {
        for (const { id, gradient } of templateGradients) {
          const refs = idToTemplateRefs.get(id);
          if (refs === undefined) {
            continue;
          }
          moveGradientAttsToTemplate(
            gradient,
            id,
            refs,
            idToTemplateRefs,
            idsReferencedByNonGradients,
          );
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} gradient
 * @param {string} id
 * @param {import('../lib/types.js').XastElement[]} referencingGradients
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToTemplateRefs
 * @param {Set<string>} idsReferencedByNonGradients
 */
function moveGradientAttsToTemplate(
  gradient,
  id,
  referencingGradients,
  idToTemplateRefs,
  idsReferencedByNonGradients,
) {
  // First make sure all refs have been processed.
  for (const ref of referencingGradients) {
    const id = ref.svgAtts.get('id')?.toString();
    if (id === undefined) {
      continue;
    }
    const childRefs = idToTemplateRefs.get(id);
    if (childRefs === undefined) {
      continue;
    }
    moveGradientAttsToTemplate(
      ref,
      id,
      childRefs,
      idToTemplateRefs,
      idsReferencedByNonGradients,
    );
  }

  // If this element is referenced directly, don't change the attributes.
  if (idsReferencedByNonGradients.has(id)) {
    return;
  }

  /** @type {Map<string,import('../lib/types.js').AttValue>} */
  const identical = new Map();

  const attList =
    gradient.local === 'linearGradient'
      ? LINEAR_GRADIENT_ATTS
      : RADIAL_GRADIENT_ATTS;

  const otherRefs = referencingGradients.slice(1);
  for (const [attName, attValue] of referencingGradients[0].svgAtts.entries()) {
    if (!attList.has(attName)) {
      continue;
    }
    const str = attValue.toString();
    if (
      otherRefs.every((ref) => ref.svgAtts.get(attName)?.toString() === str)
    ) {
      identical.set(attName, attValue);
    }
  }

  identical.forEach((attValue, attName) => {
    gradient.svgAtts.set(attName, attValue);
    referencingGradients.forEach((g) => g.svgAtts.delete(attName));
  });
}
