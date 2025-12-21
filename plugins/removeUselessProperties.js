import { addToMapArray } from '../lib/svgo/tools.js';
import {
  deleteAttAndProp,
  getParentName,
  getReferencedIds2,
} from '../lib/tools-ast.js';
import {
  elemsGroups,
  presentationPropertiesMinusTransform,
} from './_collections.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'removeUselessProperties';
export const description =
  'removes properties and attributes that have no effect';

const presentationProperties = new Set(presentationPropertiesMinusTransform);

/** @type {import('./plugins-types.js').Plugin<'removeUselessProperties'>} */
export function fn(info) {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  /** @type {import('../types/types.js').ReferenceInfo[]} */
  const referenceData = [];

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const shapes = new Set();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        referenceData.push(...getReferencedIds2(element));

        if (elemsGroups.shape.has(element.local) || element.local === 'use') {
          shapes.add(element);
        }

        const props = getPresentationProperties(element);
        /** @type {import('../types/types.js').TransformAttValue|undefined} */
        const transform = props.get('transform');
        if (transform !== undefined) {
          if (transform.isIdentityTransform()) {
            if (
              styleData.computeStyleElementProps(element).get('transform') ===
              undefined
            ) {
              deleteAttAndProp(element, 'transform');
            }
          }
        }
      },
    },
    root: {
      exit: () => {
        const referencesById = generateReferenceMap(referenceData);

        for (const shapeElement of shapes) {
          const parentName = getParentName(shapeElement);
          if (parentName !== 'defs' && parentName !== 'clipPath') {
            // Only remove from undisplayed elements.
            continue;
          }

          // If it is <use>d by a displayed element, don't remove.
          const id = shapeElement.svgAtts.get('id')?.toString();
          if (id !== undefined) {
            const referencingEls = referencesById.get(id);
            if (referencingEls) {
              if (
                referencingEls.some((info) => {
                  const referencingEl = info.element;
                  if (referencingEl.local === 'textPath') {
                    return false;
                  }
                  if (
                    referencingEl.local === 'use' &&
                    getParentName(referencingEl) === 'clipPath'
                  ) {
                    return false;
                  }
                  return true;
                })
              ) {
                continue;
              }
            }
          }

          removePresentationAttributes(shapeElement.svgAtts);
          /** @type {import('../types/types.js').StyleAttValue|undefined} */
          const style = shapeElement.svgAtts.get('style');
          if (style) {
            removePresentationAttributes(style);
            style.updateElement(shapeElement);
          }
        }
      },
    },
  };
}

/**
 * @param {import('../types/types.js').ReferenceInfo[]} references
 * @returns {Map<string,import('../types/types.js').ReferenceInfo[]>}
 */
function generateReferenceMap(references) {
  /** @type {Map<string,import('../types/types.js').ReferenceInfo[]>} */
  const referencesById = new Map();
  for (const ref of references) {
    addToMapArray(referencesById, ref.id, ref);
  }
  return referencesById;
}

/**
 * @param {import('../lib/types.js').SvgAttValues} svgAtts
 */
function removePresentationAttributes(svgAtts) {
  for (const [attName, attValue] of svgAtts.entries()) {
    if (presentationProperties.has(attName)) {
      switch (attName) {
        case 'display':
          // For clipPath, display="none" is relevant.
          if (attValue.toString() === 'none') {
            continue;
          }
          break;
        case 'clip-path':
        case 'clip-rule':
          continue;
        case 'visibility':
          // For clipPath, visibility="hidden" is relevant.
          if (attValue.toString() === 'hidden') {
            continue;
          }
          break;
      }
      svgAtts.delete(attName);
    }
  }
}
