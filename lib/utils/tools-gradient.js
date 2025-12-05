export const GRADIENT_NAMES = new Set(['linearGradient', 'radialGradient']);

const ARR_COMMON_BB_ATTS = ['gradientTransform', 'gradientUnits'];
const ARR_RADIAL_BB_ATTS = ['cx', 'cy', 'fr', 'fx', 'fy', 'r'].concat(
  ARR_COMMON_BB_ATTS,
);
export const ARR_LINEAR_BB_ATTS = ['x1', 'y1', 'x2', 'y2'].concat(
  ARR_COMMON_BB_ATTS,
);
const COMMON_GRADIENT_ATTS = new Set(
  ARR_COMMON_BB_ATTS.concat(['spreadMethod']),
);
const LINEAR_GRADIENT_ATTS = new Set(
  ARR_LINEAR_BB_ATTS.concat(['spreadMethod']),
);
const RADIAL_GRADIENT_ATTS = new Set(
  ARR_RADIAL_BB_ATTS.concat(['spreadMethod']),
);

/**
 * @param {import('../types.js').XastElement} gradient
 * @param {import('../types.js').XastElement[]} referencingGradients
 * @param {Map<string,import('../types.js').XastElement[]>} idToTemplateRefs
 */
export function minifyTemplateAtts(
  gradient,
  referencingGradients,
  idToTemplateRefs,
) {
  const alwaysOverridden = new Set();
  const identical = new Map();

  const attList =
    gradient.local === 'linearGradient'
      ? LINEAR_GRADIENT_ATTS
      : RADIAL_GRADIENT_ATTS;

  attList.forEach((attName) => {
    if (
      isAlwaysOverridden(
        gradient,
        referencingGradients,
        attName,
        idToTemplateRefs,
      )
    ) {
      alwaysOverridden.add(attName);
    }
  });

  if (referencingGradients.length > 1) {
    const otherRefs = referencingGradients.slice(1);
    for (const [
      attName,
      attValue,
    ] of referencingGradients[0].svgAtts.entries()) {
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
  }

  alwaysOverridden.forEach((attName) => {
    const attValue = identical.get(attName);
    if (attValue !== undefined) {
      gradient.svgAtts.set(attName, attValue);
      referencingGradients.forEach((g) => g.svgAtts.delete(attName));
    } else {
      gradient.svgAtts.delete(attName);
    }
  });
}

// Internal functions

/**
 * @param {import('../types.js').XastElement} gradient
 * @param {import('../types.js').XastElement[]} referencingGradients
 * @param {string} attName
 * @param {Map<string,import('../types.js').XastElement[]>} idToTemplateRefs
 * @returns {boolean}
 */
function isAlwaysOverridden(
  gradient,
  referencingGradients,
  attName,
  idToTemplateRefs,
) {
  return referencingGradients.every((referencingGradient) => {
    if (
      (referencingGradient.local !== gradient.local &&
        !COMMON_GRADIENT_ATTS.has(attName)) ||
      referencingGradient.svgAtts.get(attName) !== undefined
    ) {
      return true;
    }

    // If this gradient is referenced, return true only if all the references override the attribute.
    const id = referencingGradient.svgAtts.get('id')?.toString();
    if (id === undefined) {
      return false;
    }
    const refs = idToTemplateRefs.get(id) ?? [];
    if (refs.length === 0) {
      return false;
    }

    return isAlwaysOverridden(gradient, refs, attName, idToTemplateRefs);
  });
}
