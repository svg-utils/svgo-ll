import {
  addToMapArray,
  getBoundingBox,
  getLenPctPixels,
} from '../lib/svgo/tools.js';
import { getHrefId } from '../lib/tools-ast.js';
import { visitSkip } from '../lib/xast.js';

export const name = 'minifyGradientUnits';
export const description = 'convert to objectBoundingBox where possible';

const ARR_COMMON_BB_ATTS = ['gradientTransform', 'gradientUnits'];
const ARR_RADIAL_BB_ATTS = ['cx', 'cy', 'fr', 'fx', 'fy', 'r'].concat(
  ARR_COMMON_BB_ATTS,
);
const ARR_LINEAR_BB_ATTS = ['x1', 'y1', 'x2', 'y2'].concat(ARR_COMMON_BB_ATTS);
const GRADIENT_NAMES = new Set(['linearGradient', 'radialGradient']);
const GRADIENT_BB_ATTS = new Set(ARR_LINEAR_BB_ATTS);
const COMMON_GRADIENT_ATTS = new Set(ARR_COMMON_BB_ATTS);
const LINEAR_GRADIENT_ATTS = new Set(
  ARR_LINEAR_BB_ATTS.concat(['spreadMethod']),
);
const RADIAL_GRADIENT_ATTS = new Set(
  ARR_RADIAL_BB_ATTS.concat(['spreadMethod']),
);

/** @type {import('./plugins-types.js').Plugin<'minifyGradientUnits'>}; */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  let disabled = false;

  /** @type {Map<string,import('../lib/types.js').XastElement>} */
  const idToGradient = new Map();

  /** @type {Map<string,(import('../types/types.js').BoundingBox|undefined)[]>} */
  const idToBoundingBoxes = new Map();

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const idToTemplateRefs = new Map();

  return {
    element: {
      enter: (element, parentList) => {
        if (disabled) {
          return visitSkip;
        }
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

        const props = styleData.computeProps(element, parentList);
        const fillRef = getGradientRef(props, 'fill');
        const strokeRef = getGradientRef(props, 'stroke');
        if (fillRef === null || strokeRef === null) {
          disabled = true;
          return visitSkip;
        }
        if (fillRef || strokeRef) {
          const bb = getBoundingBox(element);
          if (fillRef) {
            addToMapArray(idToBoundingBoxes, fillRef, bb);
          }
          if (strokeRef) {
            addToMapArray(idToBoundingBoxes, strokeRef, bb);
          }
        }
      },
    },
    root: {
      exit: () => {
        // First process template gradients. If they are not referenced directly by fill or stroke, any attributes that are always
        // overridden can be removed; if the values are always the same, they can be moved to the template.
        for (const [id, referencingGradients] of idToTemplateRefs) {
          if (idToBoundingBoxes.has(id)) {
            continue;
          }

          const gradient = idToGradient.get(id);
          if (gradient === undefined) {
            // Should only happen if a gradient references a non-existent template.
            continue;
          }

          updateTemplateAtts(gradient, referencingGradients, idToTemplateRefs);

          // Since it's not referenced directly by stroke or fill, there is no need to process below.
          idToGradient.delete(id);
        }

        for (const [id, gradient] of idToGradient.entries()) {
          const bbGradient = getGradientBoundingBox(gradient);
          if (bbGradient === undefined) {
            continue;
          }
          const boundingBoxes = idToBoundingBoxes.get(id) ?? [];
          if (
            boundingBoxes.every((bb) =>
              canConvertToBoundingBoxUnits(bbGradient, bb),
            )
          ) {
            convertToBoundingBoxUnits(gradient, id, idToTemplateRefs);
          }
        }
      },
    },
  };
};

/**
 * @param {import('../types/types.js').BoundingBox} bbGradient
 * @param {import('../types/types.js').BoundingBox|undefined} bb
 * @returns {boolean}
 */
function canConvertToBoundingBoxUnits(bbGradient, bb) {
  if (bb === undefined) {
    return false;
  }

  if (!bb.x1.isEqualTo(bbGradient.x1) || !bb.x2.isEqualTo(bbGradient.x2)) {
    return false;
  }

  if (!bbGradient.y1.isEqualTo(bbGradient.y2)) {
    return false;
  }

  return true;
}

/**
 * @param {import('../lib/types.js').XastElement} gradient
 * @param {string} id
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToTemplateRefs
 */
function convertToBoundingBoxUnits(gradient, id, idToTemplateRefs) {
  const referencingGradients = idToTemplateRefs.get(id) ?? [];
  GRADIENT_BB_ATTS.forEach((attName) => {
    if (
      referencingGradients.every((g) => g.svgAtts.get(attName) !== undefined)
    ) {
      gradient.svgAtts.delete(attName);
    }
  });
}

/**
 * @param {import('../lib/types.js').XastElement} gradient
 * @returns {import('../types/types.js').BoundingBox|undefined}
 */
function getGradientBoundingBox(gradient) {
  if (gradient.svgAtts.get('gradientUnits')?.toString() !== 'userSpaceOnUse') {
    return;
  }

  const x1 = getLenPctPixels(gradient, 'x1');
  const x2 = getLenPctPixels(gradient, 'x2');
  if (x1 === undefined || x2 === undefined) {
    return;
  }

  const y1 = getLenPctPixels(gradient, 'y1');
  const y2 = getLenPctPixels(gradient, 'y2');
  if (y1 === undefined || y2 === undefined) {
    return;
  }

  /** @type {import('../types/types.js').TransformAttValue|undefined} */
  const t = gradient.svgAtts.get('gradientTransform');
  if (t === undefined) {
    return { x1: x1, y1: y1, x2: x2, y2: y2 };
  }

  const p1 = t.transformCoords({ x: x1, y: y1 });
  const p2 = t.transformCoords({ x: x2, y: y2 });
  if (p1 === undefined || p2 === undefined) {
    return;
  }

  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}

/**
 * @param {import('../lib/types.js').ComputedPropertyMap} props
 * @param {string} attName
 * @returns {string|undefined|null}
 */
function getGradientRef(props, attName) {
  const attValue = getPaintAttValue(props, attName);
  if (attValue === null || attValue === undefined) {
    return attValue;
  }
  return attValue.getReferencedID();
}

/**
 * @param {import('../lib/types.js').ComputedPropertyMap} props
 * @param {string} propName
 * @returns {import('../types/types.js').PaintAttValue|null|undefined}
 */
function getPaintAttValue(props, propName) {
  const attVal = props.get(propName);
  if (attVal === null || attVal === undefined) {
    return attVal;
  }
  return /** @type {import('../types/types.js').PaintAttValue} */ (attVal);
}

/**
 * @param {import('../lib/types.js').XastElement} gradient
 * @param {import('../lib/types.js').XastElement[]} referencingGradients
 * @param {string} attName
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToTemplateRefs
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

    // If this gradient is referenced, return true only if all the references override.
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

/**
 * @param {import('../lib/types.js').XastElement} gradient
 * @param {import('../lib/types.js').XastElement[]} referencingGradients
 * @param {Map<string,import('../lib/types.js').XastElement[]>} idToTemplateRefs
 */
function updateTemplateAtts(gradient, referencingGradients, idToTemplateRefs) {
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
