import { path2js, js2path } from './_path.js';
import { pathElems } from './_collections.js';
import { cleanupOutData, exactAdd } from '../lib/svgo/tools.js';

/**
 * @typedef {import('../lib/types.js').PathDataItem} PathDataItem
 * @typedef {import('../lib/types.js').PathDataItem&{base?:number[],coords?:[number,number]}} InitialExtendedPathDataItem
 * @typedef {import('../lib/types.js').PathDataItem&{base:number[],coords:[number,number]}} ExtendedPathDataItem
 */

export const name = 'minifyPathData';
export const description = 'writes path data in shortest form';

/**
 * @see https://www.w3.org/TR/SVG11/paths.html#PathData
 *
 * @type {import('./plugins-types.js').Plugin<'minifyPathData'>}
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector('d')
  ) {
    return;
  }

  return {
    element: {
      enter: (node, parentNode, parentInfo) => {
        if (pathElems.has(node.name) && node.attributes.d != null) {
          const computedStyle = styleData.computeStyle(node, parentInfo);
          const origData = path2js(node);
          let data = convertToRelative(origData);
          data = filterCommands(data, computedStyle);
          data = convertToMixed(data);
          if (data.length) {
            js2path(node, data, {});
          }
        }
      },
    },
  };
};

/**
 * Writes data in shortest form using absolute or relative coordinates.
 *
 * @type {(path: ExtendedPathDataItem[]) => ExtendedPathDataItem[]}
 */
function convertToMixed(path) {
  var prev = path[0];

  path = path.filter(function (item, index) {
    if (index == 0) return true;
    if (item.command === 'Z' || item.command === 'z') {
      prev = item;
      return true;
    }

    const command = item.command,
      data = item.args,
      adata = data.slice(),
      rdata = data.slice();

    if (
      command === 'm' ||
      command === 'l' ||
      command === 't' ||
      command === 'q' ||
      command === 's' ||
      command === 'c'
    ) {
      for (var i = adata.length; i--; ) {
        adata[i] = exactAdd(adata[i], item.base[i % 2]);
      }
    } else if (command == 'h') {
      adata[0] = exactAdd(adata[0], item.base[0]);
    } else if (command == 'v') {
      adata[0] = exactAdd(adata[0], item.base[1]);
    } else if (command == 'a') {
      adata[5] = exactAdd(adata[5], item.base[0]);
      adata[6] = exactAdd(adata[6], item.base[1]);
    }

    const absoluteDataStr = cleanupOutData(adata, { negativeExtraSpace: true });
    const relativeDataStr = cleanupOutData(rdata, { negativeExtraSpace: true });

    // Convert to absolute coordinates if it's shorter..
    // v-20 -> V0
    // Don't convert if it fits following previous command.
    // l20 30-10-50 instead of l20 30L20 30
    if (
      absoluteDataStr.length < relativeDataStr.length &&
      !(
        command == prev.command &&
        prev.command.charCodeAt(0) > 96 &&
        absoluteDataStr.length === relativeDataStr.length - 1 &&
        (data[0] < 0 ||
          (Math.floor(data[0]) === 0 &&
            !Number.isInteger(data[0]) &&
            prev.args[prev.args.length - 1] % 1))
      )
    ) {
      // @ts-ignore
      item.command = command.toUpperCase();
      item.args = adata;
    }

    prev = item;
    return true;
  });

  return path;
}

/**
 * Convert absolute path data coordinates to relative.
 *
 * @type {(pathData: InitialExtendedPathDataItem[]) => ExtendedPathDataItem[]}
 */
function convertToRelative(pathData) {
  let start = [0, 0];
  let cursor = [0, 0];
  let prevCoords = [0, 0];

  for (let i = 0; i < pathData.length; i++) {
    const pathItem = pathData[i];
    let { command, args } = pathItem;

    // moveto (x y)
    if (command === 'm') {
      // update start and cursor
      cursor[0] = exactAdd(cursor[0], args[0]);
      cursor[1] = exactAdd(cursor[1], args[1]);
      start[0] = cursor[0];
      start[1] = cursor[1];
    }
    if (command === 'M') {
      // M → m
      // skip first moveto
      if (i !== 0) {
        command = 'm';
      }
      args[0] = exactAdd(args[0], -cursor[0]);
      args[1] = exactAdd(args[1], -cursor[1]);
      // update start and cursor
      cursor[0] = exactAdd(cursor[0], args[0]);
      cursor[1] = exactAdd(cursor[1], args[1]);
      start[0] = cursor[0];
      start[1] = cursor[1];
    }

    // lineto (x y)
    if (command === 'l') {
      cursor[0] = exactAdd(cursor[0], args[0]);
      cursor[1] = exactAdd(cursor[1], args[1]);
    }
    if (command === 'L') {
      // L → l
      command = 'l';
      args[0] = exactAdd(args[0], -cursor[0]);
      args[1] = exactAdd(args[1], -cursor[1]);
      cursor[0] = exactAdd(cursor[0], args[0]);
      cursor[1] = exactAdd(cursor[1], args[1]);
    }

    // horizontal lineto (x)
    if (command === 'h') {
      cursor[0] = exactAdd(cursor[0], args[0]);
    }
    if (command === 'H') {
      // H → h
      command = 'h';
      args[0] = exactAdd(args[0], -cursor[0]);
      cursor[0] = exactAdd(cursor[0], args[0]);
    }

    // vertical lineto (y)
    if (command === 'v') {
      cursor[1] = exactAdd(cursor[1], args[0]);
    }
    if (command === 'V') {
      // V → v
      command = 'v';
      args[0] = exactAdd(args[0], -cursor[1]);
      cursor[1] = exactAdd(cursor[1], args[0]);
    }

    // curveto (x1 y1 x2 y2 x y)
    if (command === 'c') {
      cursor[0] = exactAdd(cursor[0], args[4]);
      cursor[1] = exactAdd(cursor[1], args[5]);
    }
    if (command === 'C') {
      // C → c
      command = 'c';
      args[0] = exactAdd(args[0], -cursor[0]);
      args[1] = exactAdd(args[1], -cursor[1]);
      args[2] = exactAdd(args[2], -cursor[0]);
      args[3] = exactAdd(args[3], -cursor[1]);
      args[4] = exactAdd(args[4], -cursor[0]);
      args[5] = exactAdd(args[5], -cursor[1]);
      cursor[0] = exactAdd(cursor[0], args[4]);
      cursor[1] = exactAdd(cursor[1], args[5]);
    }

    // smooth curveto (x2 y2 x y)
    if (command === 's') {
      cursor[0] = exactAdd(cursor[0], args[2]);
      cursor[1] = exactAdd(cursor[1], args[3]);
    }
    if (command === 'S') {
      // S → s
      command = 's';
      args[0] = exactAdd(args[0], -cursor[0]);
      args[1] = exactAdd(args[1], -cursor[1]);
      args[2] = exactAdd(args[2], -cursor[0]);
      args[3] = exactAdd(args[3], -cursor[1]);
      cursor[0] = exactAdd(cursor[0], args[2]);
      cursor[1] = exactAdd(cursor[1], args[3]);
    }

    // quadratic Bézier curveto (x1 y1 x y)
    if (command === 'q') {
      cursor[0] = exactAdd(cursor[0], args[2]);
      cursor[1] = exactAdd(cursor[1], args[3]);
    }
    if (command === 'Q') {
      // Q → q
      command = 'q';
      args[0] = exactAdd(args[0], -cursor[0]);
      args[1] = exactAdd(args[1], -cursor[1]);
      args[2] = exactAdd(args[2], -cursor[0]);
      args[3] = exactAdd(args[3], -cursor[1]);
      cursor[0] = exactAdd(cursor[0], args[2]);
      cursor[1] = exactAdd(cursor[1], args[3]);
    }

    // smooth quadratic Bézier curveto (x y)
    if (command === 't') {
      cursor[0] = exactAdd(cursor[0], args[0]);
      cursor[1] = exactAdd(cursor[1], args[1]);
    }
    if (command === 'T') {
      // T → t
      command = 't';
      args[0] = exactAdd(args[0], -cursor[0]);
      args[1] = exactAdd(args[1], -cursor[1]);
      cursor[0] = exactAdd(cursor[0], args[0]);
      cursor[1] = exactAdd(cursor[1], args[1]);
    }

    // elliptical arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
    if (command === 'a') {
      cursor[0] = exactAdd(cursor[0], args[5]);
      cursor[1] = exactAdd(cursor[1], args[6]);
    }
    if (command === 'A') {
      // A → a
      command = 'a';
      args[5] = exactAdd(args[5], -cursor[0]);
      args[6] = exactAdd(args[6], -cursor[1]);
      cursor[0] = exactAdd(cursor[0], args[5]);
      cursor[1] = exactAdd(cursor[1], args[6]);
    }

    // closepath
    if (command === 'Z' || command === 'z') {
      // reset cursor
      cursor[0] = start[0];
      cursor[1] = start[1];
    }

    pathItem.command = command;
    pathItem.args = args;
    // store absolute coordinates for later use
    // base should preserve reference from other element
    pathItem.base = prevCoords;
    pathItem.coords = [cursor[0], cursor[1]];
    prevCoords = pathItem.coords;
  }

  // @ts-ignore - all items now have base and coords attributes
  return pathData;
}

/**
 * @param {ExtendedPathDataItem[]} pathData
 * @param {Map<string,string|null>} styles
 */
function filterCommands(pathData, styles) {
  /** @type {ExtendedPathDataItem|undefined} */
  let prev;

  return pathData.filter((item, index, path) => {
    if (!prev) {
      prev = item;
      return true;
    }

    let command = item.command;
    let data = item.args;

    const lineCap = styles.get('stroke-linecap');
    if (lineCap === undefined || lineCap === 'butt') {
      // remove useless non-first path segments
      // l 0,0 / h 0 / v 0 / q 0,0 0,0 / t 0,0 / c 0,0 0,0 0,0 / s 0,0 0,0
      if (
        (command === 'l' ||
          command === 'h' ||
          command === 'v' ||
          command === 'q' ||
          command === 't' ||
          command === 'c' ||
          command === 's') &&
        data.every(function (i) {
          return i === 0;
        })
      ) {
        path[index] = prev;
        return false;
      }

      // a 25,25 -30 0,1 0,0
      if (command === 'a' && data[5] === 0 && data[6] === 0) {
        path[index] = prev;
        return false;
      }
    }

    // horizontal and vertical line shorthands
    // l 50 0 → h 50
    // l 0 50 → v 50
    if (command === 'l') {
      if (data[1] === 0) {
        command = 'h';
        data.pop();
      } else if (data[0] === 0) {
        command = 'v';
        data.shift();
      }
      item.command = command;
    }

    return true;
  });
}
