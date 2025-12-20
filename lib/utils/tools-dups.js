/**
 * @param {import('../types.js').XastElement} element
 * @param {string} [localName]
 * @returns {string}
 */
export function getElementKey(element, localName = element.local) {
  /** @type {{n:string,a:Array<string>,c:Array<{}>}} */
  const obj = {
    n: element.local,
    a: getAttributeKey(element, localName),
    c: getChildKey(element, localName),
  };
  return JSON.stringify(obj);
}

// Internal functions

/**
 * @param {import('../types.js').XastElement} element
 * @param {string} localName
 * @returns {Array<string>}
 */
function getAttributeKey(element, localName) {
  /** @type {string[]} */
  const attStrs = [];
  for (const [k, v] of element.svgAtts.entries()) {
    if (k === 'id' && element.local === localName) {
      continue;
    }
    attStrs.push(`${k}="${v}"`);
  }
  return attStrs.sort();
}

/**
 * @param {import('../types.js').XastElement} element
 * @param {string} localName
 * @returns {Array<{}>}
 */
function getChildKey(element, localName) {
  /** @type {string[]} */
  const childstrs = [];
  for (const child of element.children) {
    if (child.type === 'element') {
      childstrs.push(getElementKey(child, localName));
    }
  }
  return childstrs;
}
