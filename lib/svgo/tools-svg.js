import { StyleAttValue } from '../attrs/styleAttValue.js';
import {
  getReferencedIdsInAttribute,
  updateReferencedDeclarationIds,
} from './tools.js';

// Tools to query and update SVG elements and attributes.

/**
 * @typedef {Map<string,{referencingEl:import('../types.js').XastElement,referencingAtt:string}[]>} IdReferenceMap
 */

// Exported utilities.

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
 * @deprecated - use StylAttValue.updateElement()
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
