import { ClipPathAttValue } from './attrs/clipPathAttValue.js';
import { FilterAttValue } from './attrs/filterAttValue.js';
import { HrefAttValue } from './attrs/hrefAttValue.js';
import { MarkerAttValue } from './attrs/markerAttValue.js';
import { MaskAttValue } from './attrs/maskAttValue.js';
import { PaintAttValue } from './attrs/paintAttValue.js';
import { PresentationAttUrl } from './types/presentationAttUrl.js';

/**
 * @typedef {Map<string,{referencingEl:import('./types.js').XastElement,referencingAtt:string}[]>} IdReferenceMap
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
}

/**
 * @param {{id:string,attName:string}[]} refs
 * @param {IterableIterator<import('./types.js').AttValue>} properties
 * @returns {void}
 * @deprecated
 */
export function addReferencedIdsInStyleAttribute(refs, properties) {
  for (const v of properties) {
    const id = v.getReferencedID();
    if (id) {
      refs.push({ id: id, attName: 'style' });
    }
  }
}

/**
 * @param {{id:string,type:'p'|'a',name:string}[]} refs
 * @param {IterableIterator<[string,import('./types.js').AttValue]>} properties
 * @returns {void}
 */
export function addReferencedIdsInStyleAttribute2(refs, properties) {
  for (const [name, value] of properties) {
    const id = value.getReferencedID();
    if (id) {
      refs.push({ id: id, type: 'p', name: name });
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
}

/**
 * @param {import('./types.js').XastElement} element
 * @returns {string|undefined}
 */
export function getHrefId(element) {
  const attVal = HrefAttValue.getAttValue(element);
  if (attVal !== undefined) {
    return attVal.getReferencedID();
  }
  const xlinkHref = getXlinkHref(element);
  if (xlinkHref) {
    const value = xlinkHref.value;
    return value.startsWith('#') ? value.substring(1) : undefined;
  }
}

/**
 * @param {import("./types.js").XastElement} element
 * @param {string} local
 * @param {string} uri
 * @returns {import("./types.js").XastAttOther|undefined}
 */
export function getOtherAtt(element, local, uri) {
  if (element.otherAtts) {
    return element.otherAtts.find(
      (att) => att.local === local && att.uri === uri,
    );
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
 * @returns {{id:string,attName:string}[]}
 * @deprecated
 */
export function getReferencedIds(element) {
  /** @type {{id:string,attName:string}[]} */
  const refs = [];
  for (let [attName, value] of element.svgAtts.entries()) {
    switch (attName) {
      case 'style':
        {
          const attValue =
            /** @type {import('../types/types.js').StyleAttValue} */ (value);
          addReferencedIdsInStyleAttribute(refs, attValue.values());
        }
        break;
      default:
        {
          const id = value.getReferencedID();
          if (id) {
            refs.push({ id: id, attName: attName });
          }
        }
        break;
    }
  }

  const href = getXlinkHref(element);
  if (href && href.value.startsWith('#')) {
    refs.push({ id: href.value.substring(1), attName: 'xlink:href' });
  }
  return refs;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {{id:string,type:'p'|'a',name:string}[]}
 */
export function getReferencedIds2(element) {
  /** @type {{id:string,type:'p'|'a',name:string}[]} */
  const refs = [];
  for (let [attName, value] of element.svgAtts.entries()) {
    switch (attName) {
      case 'style':
        {
          const attValue =
            /** @type {import('../types/types.js').StyleAttValue} */ (value);
          addReferencedIdsInStyleAttribute2(refs, attValue.entries());
        }
        break;
      default:
        {
          const id = value.getReferencedID();
          if (id) {
            refs.push({ id: id, type: 'a', name: attName });
          }
        }
        break;
    }
  }

  const href = getXlinkHref(element);
  if (href && href.value.startsWith('#')) {
    refs.push({ id: href.value.substring(1), type: 'a', name: 'xlink:href' });
  }
  return refs;
}

/**
 * @param {import('./types.js').XastRoot} root
 * @return {import('./types.js').XastElement}
 */
export function getSVGElement(root) {
  for (const child of root.children) {
    if (
      child.type === 'element' &&
      child.uri === undefined &&
      child.local === 'svg'
    ) {
      return child;
    }
  }
  throw new Error();
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
  return (
    element.svgAtts.count() > 0 ||
    (element.otherAtts !== undefined && element.otherAtts.length > 0)
  );
}

/**
 * @param {import('./types.js').XastElement} element
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
    references.push({
      referencingEl: element,
      referencingAtt: attName,
    });
  }
}

/**
 * @param {import('./types.js').XastElement} element
 * @param {string} attName
 * @param {Map<string,string>} idMap
 */
export function updateReferencedId(element, attName, idMap) {
  switch (attName) {
    case 'href':
      {
        /** @type {HrefAttValue} */
        const att = element.svgAtts.getAtt(attName);
        element.svgAtts.set(
          'href',
          new HrefAttValue('#' + getNewId(att, idMap)),
        );
      }
      break;
    case 'xlink:href':
      {
        const href = getXlinkHref(element);
        if (href === undefined) {
          throw new Error();
        }
        href.value = '#' + getNewId(href.value.substring(1), idMap);
      }
      break;
    case 'style':
      {
        /** @type {import('../types/types.js').StyleAttValue} */
        const att = element.svgAtts.getAtt(attName);
        updateReferencedDeclarationIds(att, idMap);
      }
      break;
    default:
      {
        const att = element.svgAtts.getAtt(attName);
        updateReferencedAtt(
          element.svgAtts,
          attName,
          att,
          getNewId(att, idMap),
        );
      }
      break;
  }
}

/**
 *
 * @param {import('./types.js').SvgAttValues} attMap
 * @param {Map<string,string>} idMap
 */
export function updateReferencedDeclarationIds(attMap, idMap) {
  for (const [propName, v] of attMap.entries()) {
    const id = v.getReferencedID();
    if (id === undefined) {
      continue;
    }
    const newId = idMap.get(id);
    if (newId === undefined) {
      continue;
    }
    updateReferencedAtt(attMap, propName, v, newId);
  }
}

// Internal utilities.

/**
 * @param {import('./types.js').AttValue|string} att
 * @param {Map<string,string>} idMap
 * @returns {string}
 */
function getNewId(att, idMap) {
  if (att === undefined) {
    throw new Error();
  }
  const id = typeof att === 'string' ? att : att.getReferencedID();
  if (id === undefined) {
    throw new Error();
  }
  const newId = idMap.get(id);
  if (newId === undefined) {
    throw new Error();
  }
  return newId;
}

/**
 * @param {import('./types.js').SvgAttValues} attMap
 * @param {string} attName
 * @param {import('./types.js').AttValue} attValue
 * @param {string} newId
 */
function updateReferencedAtt(attMap, attName, attValue, newId) {
  const newURL = '#' + newId;
  switch (attName) {
    case 'clip-path':
      attMap.set(
        attName,
        new ClipPathAttValue(
          undefined,
          attValue.isImportant(),
          new PresentationAttUrl(undefined, newURL),
        ),
      );
      break;
    case 'fill':
    case 'stroke':
      {
        /** @type {PaintAttValue} */
        const att = attMap.getAtt(attName);
        attMap.set(
          attName,
          new PaintAttValue(
            undefined,
            att.isImportant(),
            att.getColor(),
            new PresentationAttUrl(undefined, newURL),
          ),
        );
      }
      break;
    case 'filter':
      attMap.set(
        attName,
        new FilterAttValue(
          undefined,
          attValue.isImportant(),
          new PresentationAttUrl(undefined, newURL),
        ),
      );
      break;
    case 'marker-end':
    case 'marker-mid':
    case 'marker-start':
      attMap.set(
        attName,
        new MarkerAttValue(
          undefined,
          attValue.isImportant(),
          new PresentationAttUrl(undefined, newURL),
        ),
      );
      break;
    case 'mask':
      {
        attMap.set(
          attName,
          new MaskAttValue(
            undefined,
            attValue.isImportant(),
            new PresentationAttUrl(undefined, newURL),
          ),
        );
      }
      break;
    default:
      throw new Error(attName);
  }
}
