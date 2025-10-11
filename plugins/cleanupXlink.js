import { RawUrlAttValue } from '../lib/attrs/rawUrlAttValue.js';
import {
  deleteOtherAtt,
  getXlinkHref,
  setSVGAttValue,
} from '../lib/tools-ast.js';

export const name = 'cleanupXlink';
export const description = 'replaces xlink:href with href';

/**
 * @type {import('./plugins-types.js').Plugin<'cleanupXlink'>}
 */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector()
  ) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined || element.otherAtts === undefined) {
          return;
        }

        const att = getXlinkHref(element);
        if (att) {
          if (!element.attributes.href) {
            setSVGAttValue(element, 'href', new RawUrlAttValue(att.value));
          }
          deleteOtherAtt(element, att);
        }
      },
    },
  };
};
