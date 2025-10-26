import {
  inheritableAttrs,
  attrsGroups,
  presentationNonInheritableGroupAttrs,
  presentationProperties,
} from './_collections.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'removeNonInheritableGroupAttrs';
export const description =
  'removes non-inheritable groups presentational attributes';

/**
 * Remove non-inheritable groups "presentation" attributes.
 *
 * @type {import('./plugins-types.js').Plugin<'removeNonInheritableGroupAttrs'>}
 */
export const fn = () => {
  return {
    element: {
      exit: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        if (element.local !== 'g') {
          return;
        }

        const candidates = new Set();
        for (const name of element.svgAtts.keys()) {
          if (
            presentationProperties.has(name) &&
            !inheritableAttrs.has(name) &&
            !presentationNonInheritableGroupAttrs.has(name)
          ) {
            candidates.add(name);
          }
        }

        if (candidates.size === 0) {
          return;
        }

        // Make sure no attributes are inherited by children.
        for (const child of element.children) {
          if (child.type !== 'element') {
            continue;
          }
          const childProps = getPresentationProperties(child);
          for (const [name, value] of childProps.entries()) {
            if (value.toString() === 'inherit') {
              candidates.delete(name);
              if (candidates.size === 0) {
                return;
              }
            }
          }
        }

        for (const attName of candidates.values()) {
          element.svgAtts.delete(attName);
        }
      },
    },
  };
};
