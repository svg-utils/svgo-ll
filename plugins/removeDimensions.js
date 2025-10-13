import { visitSkip } from '../lib/xast.js';

export const name = 'removeDimensions';
export const description =
  'removes width and height in presence of viewBox (opposite to removeViewBox)';

/**
 * Remove width/height attributes and add the viewBox attribute if it's missing
 *
 * @example
 * <svg width="100" height="50" />
 *   ↓
 * <svg viewBox="0 0 100 50" />
 *
 * @type {import('./plugins-types.js').Plugin<'removeDimensions'>}
 */
export const fn = () => {
  return {
    element: {
      enter: (element) => {
        if (element.uri === undefined && element.local === 'svg') {
          if (element.attributes.viewBox) {
            delete element.attributes.width;
            delete element.attributes.height;
          } else if (
            element.attributes.width &&
            element.attributes.height &&
            Number.isNaN(Number(element.attributes.width)) === false &&
            Number.isNaN(Number(element.attributes.height)) === false
          ) {
            const width = Number(element.attributes.width);
            const height = Number(element.attributes.height);
            element.attributes.viewBox = `0 0 ${width} ${height}`;
            delete element.attributes.width;
            delete element.attributes.height;
          }
        }
        return visitSkip;
      },
    },
  };
};
