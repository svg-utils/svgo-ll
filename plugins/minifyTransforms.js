/**
 * @deprecated
 * @typedef {{ name: string, data: number[] }} TransformItem
 */

export const name = 'minifyTransforms';
export const description = 'Make transform expressions as short as possible';

/**
 * Make transform expressions as short as possible.
 *
 * @type {import('./plugins-types.js').Plugin<'minifyTransforms'>}
 */
export const fn = () => {
  return {
    element: {
      enter: (element) => {
        /** @param {string} attName */
        function processAttribute(attName) {
          /** @type {import('../types/types.js').TransformAttValue|undefined} */
          const transform = element.svgAtts.get(attName);
          if (transform === undefined) {
            return;
          }
          const minified = transform.minify();
          if (minified.isIdentityTransform()) {
            element.svgAtts.delete(attName);
          } else {
            element.svgAtts.set(attName, minified);
          }
        }
        ['transform', 'gradientTransform', 'patternTransform'].forEach(
          (attName) => processAttribute(attName),
        );
      },
    },
  };
};
