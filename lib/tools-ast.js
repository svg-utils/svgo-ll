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

export const NS_XLINK = 'http://www.w3.org/1999/xlink';

/**
 * @param {import("./types.js").XastElement} element
 * @param {import("./types.js").XastAttOther} att
 */
export function deleteOtherAtt(element, att) {
  if (element.otherAtts) {
    element.otherAtts = element.otherAtts.filter((a) => a !== att);
  }
  delete element.attributes[
    att.prefix !== '' ? `${att.prefix}:${att.local}` : att.local
  ];
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
        addReferencedIdsInStyleAttribute(
          refs,
          StyleAttValue.getStyleAttValue(element),
        );
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
  element.attributes[
    att.prefix !== '' ? `${att.prefix}:${att.local}` : att.local
  ] = att.value;
}

/**
 * @param {import("./types.js").XastElement} element
 * @param {string} name
 * @param {import("./types.js").AttValue} value
 * @deprecated
 */
export function setSVGAttValue(element, name, value) {
  element.attributes[name] = value;
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
  // TODO: should no longer need literalString; just create a new RawUrlAttValue.
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
