import { referencesProps } from '../plugins/_collections.js';
import { StyleAttValue } from './attrs/styleAttValue.js';
import {
  getReferencedIdInStyleProperty,
  getReferencedIdsInAttribute,
  RE_ATT_URL,
  RE_HREF_URL,
  updateReferencedDeclarationIds,
} from './svgo/tools.js';

/**
 * @typedef {Map<string,{referencingEl:import('./types.js').XastElement,referencingAtt:string,uri:string|undefined}[]>} IdReferenceMap
 */

export const NS_SVG = 'http://www.w3.org/2000/svg';
export const NS_XLINK = 'http://www.w3.org/1999/xlink';
export const NS_XMLNS = 'http://www.w3.org/2000/xmlns/';
export const NS_XML = 'http://www.w3.org/XML/1998/namespace';

/**
 * @param {import('./types.js').XastElement} element
 * @param {string} local
 * @param {string} uri
 * @param {string} prefix
 * @param {string} value
 */
export function addOtherAtt(element, local, uri, prefix, value) {
  if (element.otherAtts === undefined) {
    element.otherAtts = [];
  }
  element.otherAtts.push({
    local: local,
    uri: uri,
    prefix: prefix === '' ? undefined : prefix,
    value: value,
  });
  element.attributes[makeAttName(local, prefix)] = value;
}

/**
 * @param {{id:string,attName:string}[]} refs
 * @param {IterableIterator<import('./types.js').CSSPropertyValue>} properties
 * @returns {void}
 */
export function addReferencedIdsInStyleAttribute(refs, properties) {
  for (const decl of properties) {
    const idInfo = getReferencedIdInStyleProperty(decl.value.toString());
    if (idInfo) {
      refs.push({ id: idInfo.id, attName: 'style' });
    }
  }
}

/**
 * @param {import('./types.js').XastElement} element
 * @param {...string} attNames
 */
export function deleteAtts(element, ...attNames) {
  for (const attName of attNames) {
    element.svgAtts.delete(attName);
  }
}

/**
 * @param {import('./types.js').XastElement} element
 */
export function deleteAllAtts(element) {
  for (const name of element.svgAtts.keys()) {
    element.svgAtts.delete(name);
  }
}

/**
 * @param {import("./types.js").XastElement} element
 * @param {import("./types.js").XastAttOther} att
 */
export function deleteOtherAtt(element, att) {
  if (element.otherAtts) {
    element.otherAtts = element.otherAtts.filter((a) => a !== att);
  }
  delete element.attributes[makeAttName(att.local, att.prefix ?? '')];
}

/**
 * @param {import('./types.js').XastElement} element
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
      if (ids && ids.length > 0) {
        return ids[0].id;
      }
    }
  }

  const attVal = element.attributes['href'];
  if (attVal !== undefined) {
    return getID('href', attVal.toString());
  }
  const xlinkHref = getXlinkHref(element);
  if (xlinkHref) {
    const value = xlinkHref.value;
    return value.startsWith('#') ? value.substring(1) : undefined;
  }
}

/**
 * @param {import('./types.js').XastElement} element
 * @returns {IterableIterator<import('./types.js').XastAttOther>}
 */
export function getOtherAtts(element) {
  if (element.otherAtts === undefined) {
    return [].values();
  }
  return element.otherAtts.values();
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {{id:string,attName:string,uri:string|undefined}[]}
 */
export function getReferencedIds(element) {
  /**
   * @param {RegExp} re
   * @param {number} matchIndex
   * @param {string} name
   * @param {string|undefined} uri
   * @param {string} value
   */
  function addURL(re, matchIndex, name, uri, value) {
    const match = re.exec(value);
    if (match != null) {
      refs.push({
        id: decodeURIComponent(match[matchIndex]),
        attName: name,
        uri: uri,
      });
    }
  }

  /** @type {{id:string,attName:string,uri:string|undefined}[]} */
  const refs = [];
  for (const [attName, value] of Object.entries(element.attributes)) {
    switch (attName) {
      case 'href':
        addURL(RE_HREF_URL, 1, attName, undefined, value.toString());
        break;
      case 'style':
        {
          const attValue = StyleAttValue.getStyleAttValue(element);
          if (attValue) {
            addReferencedIdsInStyleAttribute(refs, attValue.values());
          }
        }
        break;
      default:
        if (referencesProps.has(attName)) {
          addURL(RE_ATT_URL, 2, attName, undefined, value.toString());
        }
        break;
    }
  }

  const href = getXlinkHref(element);
  if (href) {
    addURL(RE_HREF_URL, 1, href.local, href.uri, href.value.toString());
  }
  return refs;
}

/**
 * @param {import("./types.js").XastElement} element
 * @returns {import("./types.js").XastAttOther|undefined}
 */
export function getXlinkHref(element) {
  if (element.otherAtts) {
    return element.otherAtts.find(
      (att) => att.local === 'href' && att.uri === NS_XLINK,
    );
  }
}

/**
 * @param {import("./types.js").XastElement} element
 * @param {string} attName
 * @returns {import("./types.js").XastAttOther|undefined}
 */
export function getXmlNSAtt(element, attName) {
  if (element.otherAtts) {
    return element.otherAtts.find(
      (att) => att.local === attName && att.uri === NS_XML,
    );
  }
}

/**
 * @param {import('./types.js').XastElement} element
 * @returns {boolean}
 */
export function hasAttributes(element) {
  return Object.keys(element.attributes).length !== 0;
}

/**
 * @param {import('./types.js').XastElement} element
 * @param {IdReferenceMap} allReferencedIds
 */
export function recordReferencedIds(element, allReferencedIds) {
  const referencedIds = getReferencedIds(element);
  for (const { id, attName, uri } of referencedIds) {
    let references = allReferencedIds.get(id);
    if (!references) {
      references = [];
      allReferencedIds.set(id, references);
    }
    references.push({
      referencingEl: element,
      referencingAtt: attName,
      uri: uri,
    });
  }
}

/**
 * @param {import("./types.js").XastElement} element
 * @param {import("./types.js").XastAttOther} att
 */
export function updateOtherAtt(element, att) {
  element.attributes[makeAttName(att.local, att.prefix ?? '')] = att.value;
}

/**
 * @param {import('./types.js').XastElement} element
 * @param {string} attName
 * @param {string|undefined} uri
 * @param {Map<string,string>} idMap
 */
export function updateReferencedId(element, attName, uri, idMap) {
  if (attName === 'style') {
    updateReferencedStyleId(element, idMap);
    return;
  }

  let xlinkHref;
  if (uri !== undefined) {
    xlinkHref = getXlinkHref(element);
    if (xlinkHref === undefined) {
      throw new Error();
    }
  }

  const attValue = xlinkHref
    ? xlinkHref.value.toString()
    : element.attributes[attName].toString();
  if (attValue === undefined) {
    throw new Error();
  }

  const ids = getReferencedIdsInAttribute(attName, attValue);
  if (ids.length !== 1) {
    throw new Error();
  }
  const newId = idMap.get(ids[0].id);
  if (newId === undefined) {
    throw new Error();
  }
  // TODO: should no longer need literalString; just create a new AttValue.
  if (xlinkHref) {
    xlinkHref.value = '#' + newId;
    updateOtherAtt(element, xlinkHref);
  } else {
    element.attributes[attName] = attValue.replace(
      '#' + ids[0].literalString,
      '#' + newId,
    );
  }
}

// Internal utilities.

/**
 * @param {import('./types.js').XastElement} element
 * @param {Map<string,string>} idMap
 */
function updateReferencedStyleId(element, idMap) {
  const styleAttValue = StyleAttValue.getStyleAttValue(element);
  if (styleAttValue === undefined) {
    throw new Error();
  }
  updateReferencedDeclarationIds(styleAttValue, idMap);
}

// Internal Utilities

/**
 * @param {string} local
 * @param {string} prefix
 * @returns {string}
 */
function makeAttName(local, prefix) {
  if (prefix === '') {
    return local;
  }
  if (local === '') {
    return prefix;
  }
  return `${prefix}:${local}`;
}
