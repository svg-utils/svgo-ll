import { LengthPercentageAttValue } from '../lib/attrs/lengthPercentageAttValue.js';
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
        if (element.uri !== undefined || element.local !== 'svg') {
          return;
        }

        if (element.svgAtts.get('viewBox')) {
          element.svgAtts.delete('width');
          element.svgAtts.delete('height');
          return visitSkip;
        }

        const width = LengthPercentageAttValue.getAttValue(element, 'width');
        const height = LengthPercentageAttValue.getAttValue(element, 'height');
        if (width !== undefined && height !== undefined) {
          const pxWidth = width.getPixels();
          const pxHeight = height.getPixels();
          if (pxWidth !== null && pxHeight !== null) {
            element.svgAtts.set('viewBox', `0 0 ${pxWidth} ${pxHeight}`);
            element.svgAtts.delete('width');
            element.svgAtts.delete('height');
          }
        }

        return visitSkip;
      },
    },
  };
};
