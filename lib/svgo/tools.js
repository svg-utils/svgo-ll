import { referencesProps } from '../../plugins/_collections.js';
import { StyleAttValue } from '../styleAttValue.js';

/**
 * @typedef {Map<string,{referencingEl:import('../types.js').XastElement,referencingAtt:string}[]>} IdReferenceMap
 * @typedef {import('../types.js').DataUri} DataUri
 * @typedef {import('../types.js').PathDataCommand} PathDataCommand
 */

const ID_CHARS = '0abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const RE_ATT_URL = /\s*url\(\s*(["'])?#([^)\s"']+)\1\s*\)/;
const RE_HREF_URL = /^\s*#([^\s]+)\s*$/;

const regReferencesUrl = /\burl\((["'])?#(.+?)\1\)/g;
const regReferencesBegin = /(\w+)\.[a-zA-Z]/;

export class SVGOError extends Error {}

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
 * @param {Map<import('../types.js').XastParent,Set<import('../types.js').XastChild>>} childrenToDeleteByParent
 * @param {import('../types.js').XastChild} child
 */
export function addChildToDelete(childrenToDeleteByParent, child) {
  let childrenToDelete = childrenToDeleteByParent.get(child.parentNode);
  if (!childrenToDelete) {
    childrenToDelete = new Set();
    childrenToDeleteByParent.set(child.parentNode, childrenToDelete);
  }
  childrenToDelete.add(child);
}

/**
 * @typedef {{
 *   noSpaceAfterFlags?: boolean,
 *   leadingZero?: boolean,
 *   negativeExtraSpace?: boolean
 * }} CleanupOutDataParams
 */

/**
 * Convert a row of numbers to an optimized string view.
 *
 * @example
 * [0, -1, .5, .5] → "0-1 .5.5"
 *
 * @type {(data: number[], params: CleanupOutDataParams, command?: PathDataCommand) => string}
 */
export const cleanupOutData = (data, params, command) => {
  let str = '';
  let delimiter;
  /**
   * @type {number}
   */
  let prev;

  data.forEach((item, i) => {
    // space delimiter by default
    delimiter = ' ';

    // no extra space in front of first number
    if (i == 0) delimiter = '';

    // no extra space after 'arcto' command flags(large-arc and sweep flags)
    // a20 60 45 0 1 30 20 → a20 60 45 0130 20
    if (params.noSpaceAfterFlags && (command == 'A' || command == 'a')) {
      var pos = i % 7;
      if (pos == 4 || pos == 5) delimiter = '';
    }

    // remove floating-point numbers leading zeros
    // 0.5 → .5
    // -0.5 → -.5
    const itemStr = params.leadingZero ? minifyNumber(item) : item.toString();

    // no extra space in front of negative number or
    // in front of a floating number if a previous number is floating too
    if (
      params.negativeExtraSpace &&
      delimiter != '' &&
      (item < 0 || (itemStr.charAt(0) === '.' && prev % 1 !== 0))
    ) {
      delimiter = '';
    }
    // save prev item value
    prev = item;
    str += delimiter + itemStr;
  });
  return str;
};

/**
 * @param {Map<import('../types.js').XastParent,Set<import('../types.js').XastChild>>} childrenToDeleteByParent
 */
export function deleteChildren(childrenToDeleteByParent) {
  // For each parent, delete no longer needed children.
  for (const [parent, childrenToDelete] of childrenToDeleteByParent) {
    parent.children = parent.children.filter((c) => !childrenToDelete.has(c));
  }
}

/**
 * @param {number} n
 * @param {number} m
 * @deprecated use ExactNum instead
 */
export function exactAdd(n, m) {
  const d1 = getNumberOfDecimalDigits(n);
  const d2 = getNumberOfDecimalDigits(m);
  return toFixed(n + m, Math.max(d1 + d2));
}

/**
 * @param {number} n
 * @param {number} m
 * @deprecated use ExactNum instead
 */
export function exactMul(n, m) {
  const d1 = getNumberOfDecimalDigits(n);
  const d2 = getNumberOfDecimalDigits(m);
  if (d1 + d2 > 12) {
    return undefined;
  }
  return toFixed(n * m, d1 + d2);
}

/**
 * @param {Map<string,import('../types.js').SVGAttValue|null>} properties
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
  /** @type {'start'|'number'|'decimal'|'exp'|'expdigits'|'end'} */
  let state = 'start';
  let hasDigits = false;
  let hasExp = false;
  let hasExpDigits = false;
  for (let index = 0; index < str.length; index++) {
    const char = str[index];
    switch (char) {
      case ' ':
        if (state === 'start' || state === 'end') {
          continue;
        } else if (state === 'number') {
          state = 'end';
        }
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        if (state === 'start') {
          hasDigits = true;
          state = 'number';
        } else if (state === 'decimal') {
          hasDigits = true;
        } else if (state === 'exp' || state === 'expdigits') {
          hasExpDigits = true;
          state = 'expdigits';
        }
        break;
      case '.':
        if (state === 'start' || state === 'number') {
          state = 'decimal';
        } else {
          return false;
        }
        break;
      case '-':
      case '+':
        if (state === 'start') {
          continue;
        } else if (state === 'exp') {
          state = 'expdigits';
        } else {
          return false;
        }
        break;
      case 'e':
      case 'E':
        if (state === 'decimal' || state === 'number') {
          state = 'exp';
          hasExp = true;
        } else {
          return false;
        }
        break;
      default:
        return false;
    }
  }
  return state !== 'start' && hasDigits && (!hasExp || hasExpDigits);
}

/**
 * Return the number as a string in shortest form.
 *
 * @param {number} n
 * @returns {string}
 */
export const minifyNumber = (n) => {
  if (n !== 0 && n < 0.001 && n > -0.001) {
    return n.toExponential();
  }

  const strValue = n.toString();

  if (0 < n && n < 1 && strValue.startsWith('0')) {
    return strValue.slice(1);
  }

  if (-1 < n && n < 0 && strValue[1] === '0') {
    return strValue[0] + strValue.slice(2);
  }

  return strValue;
};

/**
 * @param {import('../types.js').XastElement} element
 * @param {IdReferenceMap} allReferencedIds
 */
export function recordReferencedIds(element, allReferencedIds) {
  const referencedIds = getReferencedIds(element);
  for (const { id, attName } of referencedIds) {
    let references = allReferencedIds.get(id);
    if (!references) {
      references = [];
      allReferencedIds.set(id, references);
    }
    references.push({ referencingEl: element, referencingAtt: attName });
  }
}

/**
 * For example, a string that contains one or more of following would match and
 * return true:
 *
 * * `url(#gradient001)`
 * * `url('#gradient001')`
 *
 * @param {string} body
 * @returns {boolean} If the given string includes a URL reference.
 */
export const includesUrlReference = (body) => {
  return new RegExp(regReferencesUrl).test(body);
};

/**
 * @param {number} counter
 * @returns {string}
 */
export function generateId(counter) {
  let id = '';
  const len = ID_CHARS.length;
  while (counter > 0) {
    id = ID_CHARS[counter % len] + id;
    if (counter < len) {
      break;
    }
    counter = Math.floor(counter / len);
  }
  return id;
}

/**
 * @param {import('../../lib/types.js').XastElement} element
 * @returns {string|undefined}
 */
export function getHrefId(element) {
  /**
   * @param {string} attName
   * @param {string} attVal
   */
  function getID(attName, attVal) {
    if (attVal) {
      const ids = getReferencedIdsInAttribute(attName, attVal);
      if (ids) {
        return ids[0].id;
      }
    }
  }

  const attVal = element.attributes['href'];
  if (attVal !== undefined) {
    return getID('href', attVal.toString());
  }
  return getID('xlink:href', element.attributes['xlink:href'].toString());
}

/**
 * @param {string} attName
 * @param {string} value
 * @returns {{id:string,literalString:string}[]}
 */
export function getReferencedIdsInAttribute(attName, value) {
  /** @type {{id:string,literalString:string}[]} */
  const refs = [];
  /**
   * @param {RegExp} re
   * @param {number} matchIndex
   * @param {string} name
   * @param {string} value
   */
  function addURL(re, matchIndex, name, value) {
    const match = re.exec(value);
    if (match != null) {
      const literalString = match[matchIndex];
      refs.push({
        id: decodeURIComponent(literalString),
        literalString: literalString,
      });
    }
  }

  switch (attName) {
    case 'href':
    case 'xlink:href':
      addURL(RE_HREF_URL, 1, attName, value);
      break;
    default:
      if (referencesProps.has(attName)) {
        addURL(RE_ATT_URL, 2, attName, value);
      }
      break;
  }

  return refs;
}

/**
 * @param {string} propValue
 * @returns {{id:string,literalString:string}|undefined}
 */
export function getReferencedIdInStyleProperty(propValue) {
  const match = RE_ATT_URL.exec(propValue);
  if (match != null) {
    const literalString = match[2];
    return {
      id: decodeURIComponent(literalString),
      literalString: literalString,
    };
  }
}

/**
 * @param {import('../../lib/types.js').XastElement} element
 * @returns {{id:string,attName:string}[]}
 */
export function getReferencedIds(element) {
  /**
   * @param {RegExp} re
   * @param {number} matchIndex
   * @param {string} name
   * @param {string} value
   */
  function addURL(re, matchIndex, name, value) {
    const match = re.exec(value);
    if (match != null) {
      refs.push({ id: decodeURIComponent(match[matchIndex]), attName: name });
    }
  }

  /** @type {{id:string,attName:string}[]} */
  const refs = [];
  for (const [attName, value] of Object.entries(element.attributes)) {
    switch (attName) {
      case 'href':
      case 'xlink:href':
        addURL(RE_HREF_URL, 1, attName, value.toString());
        break;
      case 'style':
        addReferencedIdsInStyleAttribute(
          refs,
          StyleAttValue.getStyleAttValue(element),
        );
        break;
      default:
        if (referencesProps.has(attName)) {
          addURL(RE_ATT_URL, 2, attName, value.toString());
        }
        break;
    }
  }
  return refs;
}

/**
 * @param {{id:string,attName:string}[]} refs
 * @param {StyleAttValue|undefined} styleAttValue
 * @returns {void}
 */
function addReferencedIdsInStyleAttribute(refs, styleAttValue) {
  if (!styleAttValue) {
    return;
  }
  for (const decl of styleAttValue.values()) {
    const idInfo = getReferencedIdInStyleProperty(decl.value.toString());
    if (idInfo) {
      refs.push({ id: idInfo.id, attName: 'style' });
    }
  }
}

/**
 * @param {import('../types.js').CSSDeclarationMap} declMap
 * @param {Map<string,string>} idMap
 */
export function updateReferencedDeclarationIds(declMap, idMap) {
  for (const [propName, decl] of declMap.entries()) {
    const value = decl.value.toString();
    const idInfo = getReferencedIdInStyleProperty(value);
    if (!idInfo) {
      continue;
    }
    const newId = idMap.get(idInfo.id);
    if (newId === undefined) {
      continue;
    }
    declMap.set(propName, {
      value: value.replace('#' + idInfo.literalString, '#' + newId),
      important: decl.important,
    });
  }
}

/**
 * @param {import('../types.js').XastElement} element
 * @param {string} attName
 * @param {Map<string,string>} idMap
 */
export function updateReferencedId(element, attName, idMap) {
  if (attName === 'style') {
    updateReferencedStyleId(element, idMap);
    return;
  }

  const attValue = element.attributes[attName].toString();
  const ids = getReferencedIdsInAttribute(attName, attValue);
  if (ids.length !== 1) {
    throw new Error();
  }
  const newId = idMap.get(ids[0].id);
  if (newId === undefined) {
    throw new Error();
  }
  element.attributes[attName] = attValue.replace(
    '#' + ids[0].literalString,
    '#' + newId,
  );
}

/**
 * @param {import('../types.js').XastElement} element
 * @param {Map<string,string>} idMap
 */
function updateReferencedStyleId(element, idMap) {
  const styleAttValue = StyleAttValue.getStyleAttValue(element);
  if (styleAttValue === undefined) {
    throw new Error();
  }
  updateReferencedDeclarationIds(styleAttValue, idMap);
}

/**
 * @param {string} attribute
 * @param {string} value
 * @returns {string[]}
 * @deprecated use getReferencedIds()
 */
export function findReferences(attribute, value) {
  const results = [];

  if (referencesProps.has(attribute)) {
    const matches = value.matchAll(regReferencesUrl);
    for (const match of matches) {
      results.push(match[2]);
    }
  }

  if (attribute === 'href' || attribute === 'xlink:href') {
    const match = RE_HREF_URL.exec(value);
    if (match != null) {
      results.push(match[1]);
    }
  }

  if (attribute === 'begin') {
    const match = regReferencesBegin.exec(value);
    if (match != null) {
      results.push(match[1]);
    }
  }

  return results.map((body) => decodeURI(body));
}

/**
 * @param {string} c
 * @returns {boolean}
 */
export function isDigit(c) {
  const codePoint = c.codePointAt(0);
  if (codePoint === undefined) {
    return false;
  }
  return 48 <= codePoint && codePoint <= 57;
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

/**
 * @param {import('../types.js').XastElement} element
 * @param {StyleAttValue|undefined} styleAttValue
 * @returns {void}
 */
export function updateStyleAttribute(element, styleAttValue) {
  if (styleAttValue === undefined || styleAttValue.isEmpty()) {
    delete element.attributes.style;
  } else {
    element.attributes.style = styleAttValue;
  }
}

// Internal Utilities
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
