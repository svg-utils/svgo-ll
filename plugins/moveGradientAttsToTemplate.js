import { addToMapArray } from '../lib/svgo/tools.js';
import { getHrefId } from '../lib/tools-ast.js';
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

  /** @type {Map<string,import('../lib/types.js').XastElement>} */
  const idToGradient = new Map();

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const idToTemplateRefs = new Map();

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
          idToGradient.set(id, element);

          const referencedId = getHrefId(element);
          if (referencedId !== undefined) {
            addToMapArray(idToTemplateRefs, referencedId, element);
          }
          return;
        }
      },
    },
    root: {
      exit: () => {
        for (const [id, refs] of idToTemplateRefs) {
          const gradient = idToGradient.get(id);
          if (gradient === undefined) {
            throw new Error();
          }
          moveGradientAttsToTemplate(gradient, refs, idToTemplateRefs);
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} gradient
 * @param {import('../lib/types.js').XastElement[]} referencingGradients
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToTemplateRefs
 */
function moveGradientAttsToTemplate(
  gradient,
  referencingGradients,
  idToTemplateRefs,
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
    moveGradientAttsToTemplate(ref, childRefs, idToTemplateRefs);
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
