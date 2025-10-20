import { deleteAtts } from '../lib/tools-ast.js';

export const name = 'convertEllipseToCircle';
export const description = 'converts non-eccentric <ellipse>s to <circle>s';

/**
 * Converts non-eccentric <ellipse>s to <circle>s.
 *
 * @see https://www.w3.org/TR/SVG11/shapes.html
 *
 * @type {import('./plugins-types.js').Plugin<'convertEllipseToCircle'>}
 */
export const fn = () => {
  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          // Not in SVG namespace.
          return;
        }

        if (element.local === 'ellipse') {
          const rx = element.svgAtts.get('rx')?.toString() || '0';
          const ry = element.svgAtts.get('ry')?.toString() || '0';
          if (
            rx === ry ||
            rx === 'auto' ||
            ry === 'auto' // SVG2
          ) {
            element.local = 'circle';
            const radius = rx === 'auto' ? ry : rx;
            deleteAtts(element, 'rx', 'ry');
            element.svgAtts.set('r', radius);
          }
        }
      },
    },
  };
};
