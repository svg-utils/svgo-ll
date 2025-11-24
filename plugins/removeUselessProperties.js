import { getHrefId } from '../lib/tools-ast.js';
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
  /** @type {Set<string>} */
  const usedIds = new Set();

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const clipPathElements = new Set();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        if (element.local === 'clipPath') {
          clipPathElements.add(element);
        } else if (element.local === 'use') {
          const id = getHrefId(element);
          if (id) {
            usedIds.add(id);
          }
        }
      },
    },
    root: {
      exit: () => {
        // Check clipPath children and remove unused presentation properties.
        for (const clipPath of clipPathElements) {
          for (const child of clipPath.children) {
            if (
              child.type !== 'element' ||
              !(elemsGroups.shape.has(child.local) || child.local === 'use')
            ) {
              continue;
            }
            const id = child.svgAtts.get('id')?.toString();
            if (id !== undefined && usedIds.has(id)) {
              continue;
            }

            removePresentationAttributes(child.svgAtts);
            /** @type {import('../types/types.js').StyleAttValue|undefined} */
            const style = child.svgAtts.get('style');
            if (style) {
              removePresentationAttributes(style);
              style.updateElement(child);
            }
          }
        }
      },
    },
  };
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
      }
      svgAtts.delete(attName);
    }
  }
}
