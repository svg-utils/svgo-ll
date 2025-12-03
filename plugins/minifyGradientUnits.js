import {
  addToMapArray,
  getBoundingBox,
  getLenPctPixels,
} from '../lib/svgo/tools.js';
import { visitSkip } from '../lib/xast.js';

export const name = 'minifyGradientUnits';
export const description = 'convert to objectBoundingBox where possible';

const gradientNames = new Set(['linearGradient', 'radialGradient']);

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

  return {
    element: {
      enter: (element, parentList) => {
        if (disabled) {
          return visitSkip;
        }
        if (element.uri !== undefined) {
          return;
        }

        if (gradientNames.has(element.local)) {
          const id = element.svgAtts.get('id')?.toString();
          if (id === undefined) {
            return;
          }
          idToGradient.set(id, element);
          return;
        }

        const props = styleData.computeProps(element, parentList);
        const fill = getPaintAttValue(props, 'fill');
        if (fill === null) {
          disabled = true;
          return visitSkip;
        }
        if (fill === undefined) {
          return;
        }

        const ref = fill.getReferencedID();
        if (ref) {
          addToMapArray(idToBoundingBoxes, ref, getBoundingBox(element));
        }
      },
    },
    root: {
      exit: () => {
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
            convertToBoundingBoxUnits(gradient);
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
 */
function convertToBoundingBoxUnits(gradient) {
  ['x1', 'y1', 'x2', 'y2', 'gradientTransform', 'gradientUnits'].forEach(
    (attName) => gradient.svgAtts.delete(attName),
  );
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
