import { stringifyPathData } from '../lib/path.js';
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
 * @author Lev Solntsev
 *
 * @type {import('./plugins-types.js').Plugin<'convertShapeToPath'>}
 */
export const fn = (root, params, info) => {
  const styles = info.docData.getStyles();
  if (info.docData.hasScripts() || styles === null || styles.hasStyles()) {
    return;
  }

  const { convertArcs = false } = params;

  return {
    element: {
      enter: (node) => {
        // convert rect to path
        if (
          node.name === 'rect' &&
          node.attributes.width !== undefined &&
          node.attributes.width !== '0' &&
          node.attributes.height !== undefined &&
          node.attributes.height !== '0' &&
          node.attributes.rx == null &&
          node.attributes.ry == null
        ) {
          const x = Number(node.attributes.x || '0');
          const y = Number(node.attributes.y || '0');
          const width = Number(node.attributes.width);
          const height = Number(node.attributes.height);
          // Values like '100%' compute to NaN, thus running after
          // cleanupNumericValues when 'px' units has already been removed.
          // TODO: Calculate sizes from % and non-px units if possible.
          if (Number.isNaN(x - y + width - height)) return;
          /**
           * @type {PathDataItem[]}
           */
          const pathData = [
            { command: 'M', args: [x, y] },
            { command: 'H', args: [exactAdd(x, width)] },
            { command: 'V', args: [exactAdd(y, height)] },
            { command: 'H', args: [x] },
            { command: 'z', args: [] },
          ];
          node.name = 'path';
          node.attributes.d = stringifyPathData({ pathData });
          delete node.attributes.x;
          delete node.attributes.y;
          delete node.attributes.width;
          delete node.attributes.height;
        }

        // convert line to path
        if (node.name === 'line') {
          const x1 = Number(node.attributes.x1 || '0');
          const y1 = Number(node.attributes.y1 || '0');
          const x2 = Number(node.attributes.x2 || '0');
          const y2 = Number(node.attributes.y2 || '0');
          if (Number.isNaN(x1 - y1 + x2 - y2)) return;
          /**
           * @type {PathDataItem[]}
           */
          const pathData = [
            { command: 'M', args: [x1, y1] },
            { command: 'L', args: [x2, y2] },
          ];
          node.name = 'path';
          node.attributes.d = stringifyPathData({ pathData });
          delete node.attributes.x1;
          delete node.attributes.y1;
          delete node.attributes.x2;
          delete node.attributes.y2;
        }

        // convert polyline and polygon to path
        if (
          (node.name === 'polyline' || node.name === 'polygon') &&
          node.attributes.points != null
        ) {
          const coords = (node.attributes.points.match(regNumber) || []).map(
            Number,
          );
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
          if (node.name === 'polygon') {
            pathData.push({ command: 'z', args: [] });
          }
          node.name = 'path';
          node.attributes.d = stringifyPathData({ pathData });
          delete node.attributes.points;
        }

        //  optionally convert circle
        if (node.name === 'circle' && convertArcs) {
          const cx = Number(node.attributes.cx || '0');
          const cy = Number(node.attributes.cy || '0');
          const r = Number(node.attributes.r || '0');
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
          node.name = 'path';
          node.attributes.d = stringifyPathData({ pathData });
          delete node.attributes.cx;
          delete node.attributes.cy;
          delete node.attributes.r;
        }

        // optionally convert ellipse
        if (node.name === 'ellipse' && convertArcs) {
          const ecx = Number(node.attributes.cx || '0');
          const ecy = Number(node.attributes.cy || '0');
          const rx = Number(node.attributes.rx || '0');
          const ry = Number(node.attributes.ry || '0');
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
          node.name = 'path';
          node.attributes.d = stringifyPathData({ pathData });
          delete node.attributes.cx;
          delete node.attributes.cy;
          delete node.attributes.rx;
          delete node.attributes.ry;
        }
      },
    },
  };
};
