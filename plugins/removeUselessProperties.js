import { recordReferencedIds } from '../lib/tools-ast.js';
import {
  elemsGroups,
  presentationPropertiesMinusTransform,
} from './_collections.js';

export const name = 'removeUselessProperties';
export const description =
  'removes properties and attributes that have no effect';

const presentationProperties = new Set(presentationPropertiesMinusTransform);

/** @type {import('./plugins-types.js').Plugin<'removeUselessProperties'>} */
export function fn() {
  /** @type {import('../lib/tools-ast.js').IdReferenceMap} */
  const referenceData = new Map();

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const shapes = new Set();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        recordReferencedIds(element, referenceData);

        if (elemsGroups.shape.has(element.local) || element.local === 'use') {
          shapes.add(element);
        }
      },
    },
    root: {
      exit: () => {
        for (const shapeElement of shapes) {
          const parentName = getParentName(shapeElement);
          if (parentName !== 'defs' && parentName !== 'clipPath') {
            // Only remove from undisplayed elements.
            continue;
          }

          // If it is <use>d by a displayed element, don't remove.
          const id = shapeElement.svgAtts.get('id')?.toString();
          if (id !== undefined) {
            const referencingEls = referenceData.get(id);
            if (referencingEls) {
              if (
                referencingEls.some((referenceData) => {
                  const referencingEl = referenceData.referencingEl;
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
 * @param {import('../lib/types.js').XastElement} element
 * @returns {string|undefined}
 */
function getParentName(element) {
  return element.parentNode.type === 'element'
    ? element.parentNode.local
    : undefined;
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
