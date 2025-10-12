import { referencesProps } from '../../plugins/_collections.js';
import { StyleAttValue } from '../attrs/styleAttValue.js';
import {
  getReferencedIdInStyleProperty,
  getReferencedIdsInAttribute,
  RE_ATT_URL,
  RE_HREF_URL,
  updateReferencedDeclarationIds,
} from './tools.js';

// Tools to query and update SVG elements and attributes.

/**
 * @typedef {Map<string,{referencingEl:import('../types.js').XastElement,referencingAtt:string}[]>} IdReferenceMap
 */

// Exported utilities.

/**
 * @param {import('../../lib/types.js').XastElement} element
 * @returns {{id:string,attName:string}[]}
 * @deprecated - use function in tools-ast.js
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
 * @param {import('../types.js').XastElement} element
 * @param {string} attName
 * @param {Map<string,string>} idMap
 * @deprecated - use version in tools-ast.js
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
