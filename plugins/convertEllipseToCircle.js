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
          const rx = element.attributes.rx || '0';
          const ry = element.attributes.ry || '0';
          if (
            rx === ry ||
            rx === 'auto' ||
            ry === 'auto' // SVG2
          ) {
            element.local = 'circle';
            element.name =
              element.prefix === '' ? 'circle' : `${element.prefix}:circle`;
            const radius = rx === 'auto' ? ry : rx;
            delete element.attributes.rx;
            delete element.attributes.ry;
            element.attributes.r = radius;
          }
        }
      },
    },
  };
};
