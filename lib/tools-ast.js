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
 * @param {string} name
 * @param {import("./types.js").AttValue} value
 */
export function setSVGAttValue(element, name, value) {
  element.attributes[name] = value;
}
