import { ExactNum } from '../lib/exactnum.js';
import { LengthValue } from '../lib/length.js';
import { stringifyPathData } from '../lib/path.js';
import { stringifyPathCommands } from '../lib/pathutils.js';
import { exactAdd } from '../lib/svgo/tools.js';

/**
 * @typedef {import('../lib/types.js').PathDataItem} PathDataItem
 */

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
export const fn = function (info, params) {
  const styles = info.docData.getStyles();
  if (info.docData.hasScripts() || styles === null || styles.hasStyles()) {
    return;
  }

  const { convertArcs = false } = params;

  return {
    element: {
      enter: (element) => {
        switch (element.name) {
          case 'rect':
            convertRect(element);
            return;
        }

        // convert line to path
        if (element.name === 'line') {
          const x1 = Number(element.attributes.x1 || '0');
          const y1 = Number(element.attributes.y1 || '0');
          const x2 = Number(element.attributes.x2 || '0');
          const y2 = Number(element.attributes.y2 || '0');
          if (Number.isNaN(x1 - y1 + x2 - y2)) return;
          /**
           * @type {PathDataItem[]}
           */
          const pathData = [
            { command: 'M', args: [x1, y1] },
            { command: 'L', args: [x2, y2] },
          ];
          element.name = 'path';
          element.attributes.d = stringifyPathData({ pathData });
          delete element.attributes.x1;
          delete element.attributes.y1;
          delete element.attributes.x2;
          delete element.attributes.y2;
        }

        // convert polyline and polygon to path
        if (
          (element.name === 'polyline' || element.name === 'polygon') &&
          element.attributes.points != null
        ) {
          const coords = (
            element.attributes.points.toString().match(regNumber) || []
          ).map(Number);
          if (coords.length < 4) {
            return;
          }
          /**
           * @type {PathDataItem[]}
           */
          const pathData = [];
          for (let i = 0; i < coords.length; i += 2) {
            pathData.push({
              command: i === 0 ? 'M' : 'L',
              args: coords.slice(i, i + 2),
            });
          }
          if (element.name === 'polygon') {
            pathData.push({ command: 'z', args: [] });
          }
          element.name = 'path';
          element.attributes.d = stringifyPathData({ pathData });
          delete element.attributes.points;
        }

        //  optionally convert circle
        if (element.name === 'circle' && convertArcs) {
          const cx = Number(element.attributes.cx || '0');
          const cy = Number(element.attributes.cy || '0');
          const r = Number(element.attributes.r || '0');
          if (Number.isNaN(cx - cy + r)) {
            return;
          }
          const cyMinusR = exactAdd(cy, -r);
          /**
           * @type {PathDataItem[]}
           */
          const pathData = [
            { command: 'M', args: [cx, cyMinusR] },
            { command: 'A', args: [r, r, 0, 1, 0, cx, exactAdd(cy, r)] },
            { command: 'A', args: [r, r, 0, 1, 0, cx, cyMinusR] },
            { command: 'z', args: [] },
          ];
          element.name = 'path';
          element.attributes.d = stringifyPathData({ pathData });
          delete element.attributes.cx;
          delete element.attributes.cy;
          delete element.attributes.r;
        }

        // optionally convert ellipse
        if (element.name === 'ellipse' && convertArcs) {
          const ecx = Number(element.attributes.cx || '0');
          const ecy = Number(element.attributes.cy || '0');
          const rx = Number(element.attributes.rx || '0');
          const ry = Number(element.attributes.ry || '0');
          if (Number.isNaN(ecx - ecy + rx - ry)) {
            return;
          }
          const ecyMinusRy = exactAdd(ecy, -ry);
          /**
           * @type {PathDataItem[]}
           */
          const pathData = [
            { command: 'M', args: [ecx, ecyMinusRy] },
            { command: 'A', args: [rx, ry, 0, 1, 0, ecx, exactAdd(ecy, ry)] },
            { command: 'A', args: [rx, ry, 0, 1, 0, ecx, ecyMinusRy] },
            { command: 'z', args: [] },
          ];
          element.name = 'path';
          element.attributes.d = stringifyPathData({ pathData });
          delete element.attributes.cx;
          delete element.attributes.cy;
          delete element.attributes.rx;
          delete element.attributes.ry;
        }
      },
    },
  };
};

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

  const x =
    element.attributes.x === undefined
      ? 0
      : LengthValue.getLengthObj(element.attributes.x).getPixels();
  const y =
    element.attributes.y === undefined
      ? 0
      : LengthValue.getLengthObj(element.attributes.y).getPixels();
  const width = LengthValue.getLengthObj(element.attributes.width).getPixels();
  const height = LengthValue.getLengthObj(
    element.attributes.height,
  ).getPixels();

  if (
    x === null ||
    y === null ||
    width === null ||
    height === null ||
    width === 0 ||
    height === 0
  ) {
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
  element.name = 'path';
  element.attributes.d = stringifyPathCommands(pathData);
  delete element.attributes.x;
  delete element.attributes.y;
  delete element.attributes.width;
  delete element.attributes.height;
}
