import { LengthPercentageAttValue } from '../lib/attrs/lengthPercentageAttValue.js';
import { addToMapArray } from '../lib/svgo/tools.js';
import { getHrefId } from '../lib/tools-ast.js';
import {
  ARR_LINEAR_BB_ATTS,
  GRADIENT_NAMES,
  removeUnusedGradientAtts,
} from '../lib/utils/tools-gradient.js';
import { getBoundingBox, getLenPctPixels } from '../lib/utils/tools-shapes.js';
import { visitSkip } from '../lib/xast.js';

export const name = 'cleanupGradientAttributes';
export const description = 'remove unnecessary gradient attributes';

const GRADIENT_BB_ATTS = new Set(ARR_LINEAR_BB_ATTS);

/** @type {import('./plugins-types.js').Plugin<'cleanupGradientAttributes'>}; */
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

          removeUnusedGradientAtts(
            gradient,
            referencingGradients,
            idToTemplateRefs,
          );
        }

        for (const [id, gradient] of idToGradient.entries()) {
          const bbGradient = getGradientBoundingBox(gradient);
          if (bbGradient === undefined) {
            removeDefaultCoordinates(gradient, idToGradient);
            continue;
          }
          const boundingBoxes = idToBoundingBoxes.get(id) ?? [];
          if (
            boundingBoxes.every((bb) =>
              canConvertToBoundingBoxUnits(bbGradient, bb),
            )
          ) {
            convertToBoundingBoxUnits(gradient, id, idToTemplateRefs);
          } else {
            removeDefaultCoordinates(gradient, idToGradient);
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
 * @param {import('../lib/types.js').XastElement} gradient
 * @param {('y1'|'y2')[]} attNames
 * @param {Map<string,import('../lib/types.js').XastElement>} idToGradient
 * @returns {Object<'y1'|'y2',import('../types/types.js').LengthPercentageAttValue>|undefined}
 */
function getInheritedCoordinates(gradient, attNames, idToGradient) {
  const id = getHrefId(gradient);
  if (id === undefined) {
    return;
  }
  const templateGradient = idToGradient.get(id);
  if (templateGradient === undefined) {
    return;
  }

  /** @type {Object<'y1'|'y2',import('../types/types.js').LengthPercentageAttValue>} */
  const result = {};
  attNames.forEach((attName) => {
    /** @type {import('../types/types.js').LengthPercentageAttValue|undefined} */
    const attValue = templateGradient.svgAtts.get(attName);
    if (attValue) {
      result[attName] = attValue;
    }
  });

  const missingAtts = attNames.filter(
    (attName) => result[attName] === undefined,
  );
  if (missingAtts.length > 0) {
    const templateAtts = getInheritedCoordinates(
      templateGradient,
      missingAtts,
      idToGradient,
    );
    if (templateAtts) {
      for (const [k, v] of Object.entries(templateAtts)) {
        result[k] = v;
      }
    }
  }

  return result;
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
 * @param {Map<string,import('../lib/types.js').XastElement>} idToGradient
 */
function removeDefaultCoordinates(gradient, idToGradient) {
  const y1 = gradient.svgAtts.get('y1');
  const y2 = gradient.svgAtts.get('y2');
  if (y1 === undefined || y2 === undefined || y1.toString() !== y2.toString()) {
    return;
  }

  /** @type {('y1'|'y2')[]} */
  const coords = ['y1', 'y2'];

  // Make sure these aren't necessary to override any inherited attributes.
  /** @type {Object<'y1'|'y2',import('../types/types.js').LengthPercentageAttValue>} */
  const inherited = getInheritedCoordinates(gradient, coords, idToGradient);
  if (
    inherited &&
    (inherited['y1'] !== undefined || inherited['y2'] !== undefined)
  ) {
    coords.forEach((attName) => {
      gradient.svgAtts.set(attName, new LengthPercentageAttValue('1'));
    });
    return;
  }

  gradient.svgAtts.delete('y1');
  gradient.svgAtts.delete('y2');
}
