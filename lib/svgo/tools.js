// Basic string and numeric utilities.

import imageSize from 'image-size';

/**
 * @typedef {import('../types.js').DataUri} DataUri
 * @typedef {import('../types.js').PathDataCommand} PathDataCommand
 */

const ID_CHARS =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class SVGOError extends Error {}

/**
 * @template T
 * @param {Map<string,T[]>} map
 * @param {string} key
 * @param {T} item
 */
export function addToMapArray(map, key, item) {
  let array = map.get(key);
  if (array === undefined) {
    array = [];
    map.set(key, array);
  }
  array.push(item);
}

/**
 * Encode plain SVG data string into Data URI string.
 *
 * @type {(str: string, type?: DataUri) => string}
 */
export const encodeSVGDatauri = (str, type) => {
  var prefix = 'data:image/svg+xml';
  if (!type || type === 'base64') {
    // base64
    prefix += ';base64,';
    str = prefix + Buffer.from(str).toString('base64');
  } else if (type === 'enc') {
    // URI encoded
    str = prefix + ',' + encodeURIComponent(str);
  } else if (type === 'unenc') {
    // unencoded
    str = prefix + ',' + str;
  }
  return str;
};

/**
 * Decode SVG Data URI string into plain SVG string.
 *
 * @type {(str: string) => string}
 */
export const decodeSVGDatauri = (str) => {
  var regexp = /data:image\/svg\+xml(;charset=[^;,]*)?(;base64)?,(.*)/;
  var match = regexp.exec(str);

  // plain string
  if (!match) return str;

  var data = match[3];

  if (match[2]) {
    // base64
    str = Buffer.from(data, 'base64').toString('utf8');
  } else if (data.charAt(0) === '%') {
    // URI encoded
    str = decodeURIComponent(data);
  } else if (data.charAt(0) === '<') {
    // unencoded
    str = data;
  }
  return str;
};

/**
 * @param {string} str
 * @returns {{width:number,height:number}|undefined}
 */
export function getBase64ImageDimensions(str) {
  for (const prefix of ['data:image/png;base64,', 'data:image/jpeg;base64,']) {
    if (str.startsWith(prefix)) {
      const base64 = str.substring(prefix.length);
      const buffer = Buffer.from(base64, 'base64');
      // @ts-ignore
      return imageSize(buffer);
    }
  }
}

/**
 * @param {Map<string,string|null>} properties
 * @returns {{rx:string,ry:string}|undefined}
 */
export function getEllipseProperties(properties) {
  let rx = properties.get('rx');
  let ry = properties.get('ry');
  if (rx === undefined) {
    if (ry === undefined) {
      rx = ry = '0';
    } else {
      rx = ry;
    }
  } else if (ry === undefined) {
    ry = rx;
  }
  if (rx === null || ry === null) {
    return;
  }
  return { rx: rx.toString(), ry: ry.toString() };
}

/**
 * @param {number} counter
 * @param {Set<string>} currentIds
 * @returns {{nextId:string, nextCounter:counter}}
 */
export function getNextId(counter, currentIds) {
  let nextId;
  do {
    nextId = generateId(counter++);
  } while (currentIds.has(nextId));

  return { nextId: nextId, nextCounter: counter };
}
/**
 * @param {number|string} str
 */
export function getNumberOfDecimalDigits(str) {
  if (typeof str === 'number') {
    str = str.toString();
  }
  if (str.includes('e')) {
    // Include the number of digits both before and after the decimal point, and account for the exponent.
    const parts = str.split('e');
    const numberStr = parts[0];
    const expStr = parts[1];
    const numberParts = numberStr.split('.');
    let numberOfDecimals;
    if (numberParts.length === 2) {
      const trailingZeros = countTrailingZeros(numberParts[1]);
      if (trailingZeros !== numberParts[1].length) {
        numberOfDecimals = numberParts[1].length - trailingZeros;
      }
    }
    if (numberOfDecimals === undefined) {
      // There is no non-zero decimal part.
      numberOfDecimals = -countTrailingZeros(numberParts[0]);
    }
    const expVal = parseInt(expStr);
    return Math.max(0, numberOfDecimals - expVal);
  }
  const dotPos = str.indexOf('.');
  if (dotPos === -1) {
    return 0;
  }
  let decimals = str.slice(dotPos);
  while (decimals.endsWith('0')) {
    decimals = decimals.slice(0, decimals.length - 1);
  }
  return decimals.length - 1;
}

/**
 * @param {string} str
 * @returns {boolean}
 */
export function isNumber(str) {
  return /^\s*[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?\s*$/.test(str);
}

/**
 * @param {number} counter
 * @returns {string}
 */
export function generateId(counter) {
  let id = '';
  const len = ID_CHARS.length;

  // Change from zero to one based.
  counter++;
  // Make sure there are no leading digits.
  let max = 1;
  let adjust = 9;
  while (true) {
    if (counter < max) {
      break;
    }
    counter += adjust;
    adjust *= 62;
    max *= 62;
  }

  while (counter >= 0) {
    id = ID_CHARS[counter % len] + id;
    if (counter < len) {
      break;
    }
    counter = Math.floor(counter / len);
  }
  return id;
}

/**
 * @param {string} list
 * @returns {string[]}
 */
export function parseCwsList(list) {
  return list.trim().split(/(?:\s*,\s*|\s+)/);
}

/**
 * @param {string} funcs
 * @returns {string[]}
 */
export function parseFuncList(funcs) {
  return funcs.split(/\)(?:\s*,\s*|\s+)?/);
}

/**
 * Does the same as {@link Number.toFixed} but without casting
 * the return value to a string.
 *
 * @param {number} num
 * @param {number} precision
 * @returns {number}
 */
export const toFixed = (num, precision) => {
  const pow = 10 ** precision;
  return Math.round(num * pow) / pow;
};

// Internal Utilities.

/**
 * @param {string} str
 * #returns {number}
 */
function countTrailingZeros(str) {
  for (let index = str.length - 1; index >= 0; index--) {
    if (str[index] !== '0') {
      return str.length - 1 - index;
    }
  }
  return str.length;
}
