import { referencesProps } from '../plugins/_collections.js';
import { ClipPathAttValue } from './attrs/clipPathAttValue.js';
import { FilterAttValue } from './attrs/filterAttValue.js';
import { HrefAttValue } from './attrs/hrefAttValue.js';
import { MarkerAttValue } from './attrs/markerAttValue.js';
import { MaskAttValue } from './attrs/maskAttValue.js';
import { PaintAttValue } from './attrs/paintAttValue.js';
import { StyleAttValue } from './attrs/styleAttValue.js';
import {
  getReferencedIdInStyleProperty,
  updateReferencedDeclarationIds,
} from './svgo/tools.js';
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
}

/**
 * @param {import('./types.js').XastElement} element
 * @returns {string|undefined}
 */
export function getHrefId(element) {
  const attVal = HrefAttValue.getAttValue(element);
  if (attVal !== undefined) {
    return attVal.getID();
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
 */
export function getReferencedIds(element) {
  /** @type {{id:string,attName:string}[]} */
  const refs = [];
  for (const [attName, value] of element.svgAtts.entries()) {
    switch (attName) {
      case 'href':
        {
          const attValue = HrefAttValue.getAttValue(element);
          const id = attValue?.getID();
          if (id) {
            refs.push({ id: id, attName: 'href' });
          }
        }
        break;
      case 'style':
        {
          const attValue = StyleAttValue.getAttValue(element);
          if (attValue) {
            addReferencedIdsInStyleAttribute(refs, attValue.values());
          }
        }
        break;
      default:
        if (referencesProps.has(attName)) {
          // @ts-ignore
          const id = value.getID();
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
    element.svgAtts.hasAttributes() ||
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
    case 'clip-path':
      {
        const att = ClipPathAttValue.getAttValue(element, attName);
        element.svgAtts.set(
          attName,
          new ClipPathAttValue(
            undefined,
            new PresentationAttUrl(undefined, '#' + getNewId(att, idMap)),
          ),
        );
      }
      break;
    case 'fill':
    case 'stroke':
      {
        const att = PaintAttValue.getAttValue(element, attName);
        element.svgAtts.set(
          attName,
          new PaintAttValue(
            undefined,
            att?.getColor(),
            new PresentationAttUrl(undefined, '#' + getNewId(att, idMap)),
          ),
        );
      }
      break;
    case 'filter':
      {
        const att = FilterAttValue.getAttValue(element, attName);
        element.svgAtts.set(
          attName,
          new FilterAttValue(
            undefined,
            new PresentationAttUrl(undefined, '#' + getNewId(att, idMap)),
          ),
        );
      }
      break;
    case 'marker-end':
    case 'marker-mid':
    case 'marker-start':
      {
        const att = MarkerAttValue.getAttValue(element, attName);
        element.svgAtts.set(
          attName,
          new MarkerAttValue(
            undefined,
            new PresentationAttUrl(undefined, '#' + getNewId(att, idMap)),
          ),
        );
      }
      break;
    case 'mask':
      {
        const att = MaskAttValue.getAttValue(element, attName);
        element.svgAtts.set(
          attName,
          new MaskAttValue(
            undefined,
            new PresentationAttUrl(undefined, '#' + getNewId(att, idMap)),
          ),
        );
      }
      break;
    case 'href':
      {
        const att = HrefAttValue.getAttValue(element);
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
      updateReferencedStyleId(element, idMap);
      break;
    default:
      throw new Error(attName);
  }
}

// Internal utilities.

/**
 * @param {import('./types.js').XastElement} element
 * @param {Map<string,string>} idMap
 */
function updateReferencedStyleId(element, idMap) {
  const styleAttValue = StyleAttValue.getAttValue(element);
  if (styleAttValue === undefined) {
    throw new Error();
  }
  updateReferencedDeclarationIds(styleAttValue, idMap);
}

// Internal Utilities

/**
 * @param {ClipPathAttValue|HrefAttValue|FilterAttValue|MarkerAttValue|MaskAttValue|PaintAttValue|string|undefined} att
 * @param {Map<string,string>} idMap
 * @returns {string}
 */
function getNewId(att, idMap) {
  if (att === undefined) {
    throw new Error();
  }
  const id = typeof att === 'string' ? att : att.getID();
  if (id === undefined) {
    throw new Error();
  }
  const newId = idMap.get(id);
  if (newId === undefined) {
    throw new Error();
  }
  return newId;
}
