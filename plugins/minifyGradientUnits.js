import { addToMapArray, getBoundingBox } from '../lib/svgo/tools.js';
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
          if (id !== undefined) {
            idToGradient.set(id, element);
          }
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
        for (const [id, boundingBoxes] of idToBoundingBoxes.entries()) {
          const gradient = idToGradient.get(id);
          if (gradient === undefined) {
            continue;
          }
          if (
            boundingBoxes.every((bb) =>
              canConvertToBoundingBoxUnits(gradient, bb),
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
 * @param {import('../lib/types.js').XastElement} gradient
 * @param {import('../types/types.js').BoundingBox|undefined} bb
 * @returns {boolean}
 */
function canConvertToBoundingBoxUnits(gradient, bb) {
  if (bb === undefined) {
    return false;
  }
  if (gradient.svgAtts.get('gradientUnits')?.toString() !== 'userSpaceOnUse') {
    return false;
  }
  return true;
}

/**
 * @param {import('../lib/types.js').XastElement} gradient
 */
function convertToBoundingBoxUnits(gradient) {
  ['x1', 'y1', 'x2', 'y2', 'gradientUnits'].forEach((attName) =>
    gradient.svgAtts.delete(attName),
  );
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
