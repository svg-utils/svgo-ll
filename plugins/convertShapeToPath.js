import { ExactNum } from '../lib/exactnum.js';
import { isNumber } from '../lib/svgo/tools.js';
import { PathAttValue } from '../lib/attrs/pathAttValue.js';
import { LengthPercentageAttValue } from '../lib/attrs/lengthPercentageAttValue.js';
import { LengthPercentageAutoAttValue } from '../lib/attrs/lengthPercentageAutoAttValue.js';

export const name = 'convertShapeToPath';
export const description = 'converts basic shapes to more compact path form';

const regNumber = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

/**
 * Converts basic shape to more compact path.
 * It also allows further optimizations like
 * combining paths with similar attributes.
 *
 * @see https://www.w3.org/TR/SVG11/shapes.html
 *
 * @type {import('./plugins-types.js').Plugin<'convertShapeToPath'>}
 */
export const fn = function (info) {
  const styles = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styles === null ||
    !styles.hasOnlyFeatures([
      'class-selectors',
      'id-selectors',
      'type-selectors',
    ]) ||
    styles.hasTypeSelector('path')
  ) {
    return;
  }

  const stylesOK = {
    rect: styles !== null && !styles.hasTypeSelector('rect'),
    line: styles !== null && !styles.hasTypeSelector('line'),
    polygon: styles !== null && !styles.hasTypeSelector('polygon'),
    polyline: styles !== null && !styles.hasTypeSelector('polyline'),
  };

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          // Not in SVG namespace.
          return;
        }

        switch (element.local) {
          case 'rect':
            if (stylesOK.rect) {
              convertRect(element);
            }
            return;
          case 'line':
            if (stylesOK.line) {
              convertLine(element);
            }
            return;
          case 'polygon':
          case 'polyline':
            if (stylesOK[element.local]) {
              convertPolyline(element);
            }
            return;
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {void}
 */
function convertLine(element) {
  const x1 = getPixelsWithDefault(element, 'x1');
  const x2 = getPixelsWithDefault(element, 'x2');
  const y1 = getPixelsWithDefault(element, 'y1');
  const y2 = getPixelsWithDefault(element, 'y2');
  if (x1 === null || y1 === null || x2 === null || y2 === null) {
    return;
  }

  /** @type {import('../lib/pathutils.js').PathCommand[]} */
  const pathData = [
    { command: 'M', x: new ExactNum(x1), y: new ExactNum(y1) },
    { command: 'L', x: new ExactNum(x2), y: new ExactNum(y2) },
  ];
  element.local = 'path';
  element.svgAtts.set('d', new PathAttValue(undefined, pathData));
  ['x1', 'y1', 'x2', 'y2'].forEach((attName) =>
    element.svgAtts.delete(attName),
  );
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {void}
 */
function convertPolyline(element) {
  const points = element.svgAtts.get('points');
  if (points === undefined) {
    return;
  }

  const coords = points.toString().match(regNumber) || [];
  if (coords.length < 4) {
    return;
  }

  /** @type {import('../lib/pathutils.js').PathCommand[]} */
  const pathData = [];
  for (let i = 0; i < coords.length; i += 2) {
    const x = coords[i];
    const y = coords[i + 1];
    if (!isNumber(x) || !isNumber(y ?? '')) {
      return;
    }
    pathData.push({
      command: i === 0 ? 'M' : 'L',
      x: new ExactNum(x),
      y: new ExactNum(y),
    });
  }
  if (element.local === 'polygon') {
    pathData.push({ command: 'z' });
  }
  element.local = 'path';
  element.svgAtts.set('d', new PathAttValue(undefined, pathData));
  element.svgAtts.delete('points');
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {void}
 */
function convertRect(element) {
  const attWidth = LengthPercentageAutoAttValue.getAttValue(element, 'width');
  const attHeight = LengthPercentageAutoAttValue.getAttValue(element, 'height');
  if (
    attWidth === undefined ||
    attHeight === undefined ||
    element.svgAtts.get('rx') !== undefined ||
    element.svgAtts.get('ry') !== undefined
  ) {
    return;
  }

  const x = getPixelsWithDefault(element, 'x');
  const y = getPixelsWithDefault(element, 'y');

  if (x === null || y === null) {
    return;
  }

  const width = attWidth.getPixels();
  const height = attHeight.getPixels();

  if (width === 0 || width === null || height === 0 || height === null) {
    return;
  }

  const ex = new ExactNum(x);
  const ey = new ExactNum(y);
  const eWidth = new ExactNum(width);
  const eHeight = new ExactNum(height);

  const h = ex.add(eWidth);
  const v = ey.add(eHeight);
  if (h === undefined || v === undefined) {
    return;
  }

  /** @type {import('../lib/pathutils.js').PathCommand[]} */
  const pathData = [
    { command: 'M', x: ex, y: ey },
    { command: 'H', x: h },
    { command: 'V', y: v },
    { command: 'H', x: ex },
    { command: 'z' },
  ];
  element.local = 'path';
  element.svgAtts.set('d', new PathAttValue(undefined, pathData));
  ['x', 'y', 'width', 'height'].forEach((attName) =>
    element.svgAtts.delete(attName),
  );
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} attName
 * @returns {number|null}
 */
function getPixelsWithDefault(element, attName) {
  const att = LengthPercentageAttValue.getAttValue(element, attName);
  return att === undefined ? 0 : att.getPixels();
}
