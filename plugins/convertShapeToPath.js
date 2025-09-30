import { ExactNum } from '../lib/exactnum.js';
import { LengthValue } from '../lib/attrs/lengthValue.js';
import { stringifyPathCommands } from '../lib/pathutils.js';
import { isNumber } from '../lib/svgo/tools.js';
import { LengthOrPctValue } from '../lib/attrs/lengthOrPct.js';

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
    !styles.hasOnlyFeatures(['simple-selectors']) ||
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
  element.name = element.prefix === '' ? 'path' : `${element.prefix}:path`;
  element.attributes.d = stringifyPathCommands(pathData);
  delete element.attributes.x1;
  delete element.attributes.y1;
  delete element.attributes.x2;
  delete element.attributes.y2;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {void}
 */
function convertPolyline(element) {
  if (element.attributes.points === undefined) {
    return;
  }

  const coords = element.attributes.points.toString().match(regNumber) || [];
  if (coords.length < 4) {
    return;
  }

  /** @type {import('../lib/pathutils.js').PathCommand[]} */
  const pathData = [];
  for (let i = 0; i < coords.length; i += 2) {
    const x = coords[i];
    const y = coords[i + 1];
    if (!isNumber(x) || !isNumber(y)) {
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
  element.name = element.prefix === '' ? 'path' : `${element.prefix}:path`;
  element.attributes.d = stringifyPathCommands(pathData);
  delete element.attributes.points;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {void}
 */
function convertRect(element) {
  if (
    element.attributes.width === undefined ||
    element.attributes.height === undefined ||
    element.attributes.rx !== undefined ||
    element.attributes.ry !== undefined
  ) {
    return;
  }

  const x = getPixelsWithDefault(element, 'x');
  const y = getPixelsWithDefault(element, 'y');
  const widthValue = LengthOrPctValue.getAttValue(element, 'width');
  const heightValue = LengthOrPctValue.getAttValue(element, 'height');

  if (
    x === null ||
    y === null ||
    widthValue === undefined ||
    heightValue === undefined
  ) {
    return;
  }

  const width = widthValue.getPixels();
  const height = heightValue.getPixels();

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
  element.name = element.prefix === '' ? 'path' : `${element.prefix}:path`;
  element.attributes.d = stringifyPathCommands(pathData);
  delete element.attributes.x;
  delete element.attributes.y;
  delete element.attributes.width;
  delete element.attributes.height;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} attName
 * @returns {number|null}
 */
function getPixelsWithDefault(element, attName) {
  return element.attributes[attName] === undefined
    ? 0
    : LengthValue.getObj(element.attributes[attName]).getPixels();
}
