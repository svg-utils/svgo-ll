import { ExactNum } from '../exactnum.js';

/**
 * @param {import('../types.js').XastElement} element
 * @returns {import('../../types/types.js').BoundingBox|undefined}
 */
export function getBoundingBox(element) {
  switch (element.local) {
    case 'rect': {
      const x = getLenPctPixels(element, 'x');
      const y = getLenPctPixels(element, 'y');
      const width = getLenPctPixels(element, 'width');
      const height = getLenPctPixels(element, 'height');
      if (
        x === undefined ||
        y === undefined ||
        width === undefined ||
        height === undefined
      ) {
        return;
      }

      const x2 = x.add(width);
      const y2 = y.add(height);
      if (x2 === undefined || y2 === undefined) {
        return;
      }

      return {
        x1: x,
        y1: y,
        x2: x2,
        y2: y2,
      };
    }
  }
}

/**
 * @param {import('../types.js').XastElement} element
 * @param {string} attName
 * @returns {ExactNum|undefined}
 */
export function getLenPctPixels(element, attName) {
  /** @type {import('../../types/types.js').LengthPercentageAttValue|undefined} */
  const att = element.svgAtts.get(attName);
  if (att === undefined) {
    return;
  }
  const px = att.getPixels();
  if (px === null) {
    return;
  }
  return new ExactNum(px);
}
