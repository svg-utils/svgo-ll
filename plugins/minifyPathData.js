import { pathElems } from './_collections.js';
import { cleanupOutData, exactAdd, minifyNumber } from '../lib/svgo/tools.js';

/**
 * @typedef {import('../lib/types.js').PathDataItem} PathDataItem
 * @typedef {import('../lib/types.js').PathDataCommand} PathDataCommand
 * @typedef {'none' | 'sign' | 'whole' | 'decimal_point' | 'decimal' | 'e' | 'exponent_sign' | 'exponent'} ReadNumberState
 * @typedef {import('../lib/types.js').PathDataItem&{base?:number[],coords?:[number,number]}} InitialExtendedPathDataItem
 * @typedef {import('../lib/types.js').PathDataItem&{base:number[],coords:[number,number]}} ExtendedPathDataItem
 */

export const name = 'minifyPathData';
export const description = 'writes path data in shortest form';

const argsCountPerCommand = {
  M: 2,
  m: 2,
  Z: 0,
  z: 0,
  L: 2,
  l: 2,
  H: 1,
  h: 1,
  V: 1,
  v: 1,
  C: 6,
  c: 6,
  S: 4,
  s: 4,
  Q: 4,
  q: 4,
  T: 2,
  t: 2,
  A: 7,
  a: 7,
};

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
            js2path(node, data);
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

/**
 * @type {(c: string) => c is PathDataCommand}
 */
const isCommand = (c) => {
  return c in argsCountPerCommand;
};

/**
 * @param {string} c
 * @returns {boolean}
 */
const isDigit = (c) => {
  const codePoint = c.codePointAt(0);
  if (codePoint == null) {
    return false;
  }
  return 48 <= codePoint && codePoint <= 57;
};

/**
 * @param {string} c
 * @returns {boolean}
 */
const isWhiteSpace = (c) => {
  return c === ' ' || c === '\t' || c === '\r' || c === '\n';
};

/**
 * Convert path array to string.
 *
 * @param {import('../lib/types.js').XastElement} path
 * @param {PathDataItem[]} data
 */
function js2path(path, data) {
  path.attributes.d = stringifyPathData(data);
}

/**
 * @param {string} string
 * @returns {PathDataItem[]}
 */
export const parsePathData = (string) => {
  /**
   * @type {PathDataItem[]}
   */
  const pathData = [];
  /**
   * @type {PathDataCommand|null}
   */
  let command = null;
  let args = /** @type {number[]} */ ([]);
  let argsCount = 0;
  let canHaveComma = false;
  let hadComma = false;
  for (let i = 0; i < string.length; i += 1) {
    const c = string.charAt(i);
    if (isWhiteSpace(c)) {
      continue;
    }
    // allow comma only between arguments
    if (canHaveComma && c === ',') {
      if (hadComma) {
        break;
      }
      hadComma = true;
      continue;
    }
    if (isCommand(c)) {
      if (hadComma) {
        return pathData;
      }
      if (command == null) {
        // moveto should be leading command
        if (c !== 'M' && c !== 'm') {
          return pathData;
        }
      } else if (args.length !== 0) {
        // stop if previous command arguments are not flushed
        return pathData;
      }
      command = c;
      args = [];
      argsCount = argsCountPerCommand[command];
      canHaveComma = false;
      // flush command without arguments
      if (argsCount === 0) {
        pathData.push({ command, args });
      }
      continue;
    }
    // avoid parsing arguments if no command detected
    if (command == null) {
      return pathData;
    }
    // read next argument
    let newCursor = i;
    let number = null;
    if (command === 'A' || command === 'a') {
      const position = args.length;
      if (position === 0 || position === 1) {
        // allow only positive number without sign as first two arguments
        if (c !== '+' && c !== '-') {
          [newCursor, number] = readNumber(string, i);
        }
      }
      if (position === 2 || position === 5 || position === 6) {
        [newCursor, number] = readNumber(string, i);
      }
      if (position === 3 || position === 4) {
        // read flags
        if (c === '0') {
          number = 0;
        }
        if (c === '1') {
          number = 1;
        }
      }
    } else {
      [newCursor, number] = readNumber(string, i);
    }
    if (number == null) {
      return pathData;
    }
    args.push(number);
    canHaveComma = true;
    hadComma = false;
    i = newCursor;
    // flush arguments when necessary count is reached
    if (args.length === argsCount) {
      pathData.push({ command, args });
      // subsequent moveto coordinates are treated as implicit lineto commands
      if (command === 'M') {
        command = 'L';
      }
      if (command === 'm') {
        command = 'l';
      }
      args = [];
    }
  }
  return pathData;
};

/**
 * @param {import('../lib/types.js').XastElement} path
 * @returns {PathDataItem[]}
 */
function path2js(path) {
  /**
   * @type {PathDataItem[]}
   */
  const pathData = []; // JS representation of the path data
  const newPathData = parsePathData(path.attributes.d);
  for (const { command, args } of newPathData) {
    pathData.push({ command, args });
  }
  // First moveto is actually absolute. Subsequent coordinates were separated above.
  if (pathData.length && pathData[0].command == 'm') {
    pathData[0].command = 'M';
  }
  return pathData;
}

/**
 * @type {(string: string, cursor: number) => [number, ?number]}
 */
const readNumber = (string, cursor) => {
  let i = cursor;
  let value = '';
  let state = /** @type {ReadNumberState} */ ('none');
  for (; i < string.length; i += 1) {
    const c = string[i];
    if (c === '+' || c === '-') {
      if (state === 'none') {
        state = 'sign';
        value += c;
        continue;
      }
      if (state === 'e') {
        state = 'exponent_sign';
        value += c;
        continue;
      }
    }
    if (isDigit(c)) {
      if (state === 'none' || state === 'sign' || state === 'whole') {
        state = 'whole';
        value += c;
        continue;
      }
      if (state === 'decimal_point' || state === 'decimal') {
        state = 'decimal';
        value += c;
        continue;
      }
      if (state === 'e' || state === 'exponent_sign' || state === 'exponent') {
        state = 'exponent';
        value += c;
        continue;
      }
    }
    if (c === '.') {
      if (state === 'none' || state === 'sign' || state === 'whole') {
        state = 'decimal_point';
        value += c;
        continue;
      }
    }
    if (c === 'E' || c == 'e') {
      if (
        state === 'whole' ||
        state === 'decimal_point' ||
        state === 'decimal'
      ) {
        state = 'e';
        value += c;
        continue;
      }
    }
    break;
  }
  const number = Number.parseFloat(value);
  if (Number.isNaN(number)) {
    return [cursor, null];
  } else {
    // step back to delegate iteration to parent loop
    return [i - 1, number];
  }
};

/**
 * @param {PathDataItem[]} pathData
 * @returns {string}
 */
function stringifyPathData(pathData) {
  if (pathData.length === 1) {
    const { command, args } = pathData[0];
    return command + stringifyArgs(command, args);
  }

  const commands = [];
  let prev = { ...pathData[0] };

  // match leading moveto with following lineto
  if (pathData[1].command === 'L') {
    prev.command = 'M';
  } else if (pathData[1].command === 'l') {
    prev.command = 'm';
  }

  for (let i = 1; i < pathData.length; i++) {
    const { command, args } = pathData[i];
    if (
      (prev.command === command &&
        prev.command !== 'M' &&
        prev.command !== 'm') ||
      // combine matching moveto and lineto sequences
      (prev.command === 'M' && command === 'L') ||
      (prev.command === 'm' && command === 'l')
    ) {
      prev.args = [...prev.args, ...args];
      if (i === pathData.length - 1) {
        commands.push(prev.command + stringifyArgs(prev.command, prev.args));
      }
    } else {
      commands.push(prev.command + stringifyArgs(prev.command, prev.args));

      if (i === pathData.length - 1) {
        commands.push(command + stringifyArgs(command, args));
      } else {
        prev = { command, args };
      }
    }
  }

  return commands.join('');
}

/**
 * @param {string} command
 * @param {number[]} args
 */
function stringifyArgs(command, args) {
  let result = '';
  let previous;

  for (let i = 0; i < args.length; i++) {
    const roundedStr = minifyNumber(args[i]);
    if (i === 0 || args[i] < 0) {
      // avoid space before first and negative numbers
      result += roundedStr;
    } else if (!Number.isInteger(previous) && !isDigit(roundedStr[0])) {
      // remove space before decimal with zero whole
      // only when previous number is also decimal
      result += roundedStr;
    } else {
      result += ` ${roundedStr}`;
    }
    previous = args[i];
  }

  return result;
}
