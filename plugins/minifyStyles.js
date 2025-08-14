/**
 * @typedef {import('../lib/types.js').XastElement} XastElement
 * @typedef {import('../lib/types.js').XastParent} XastParent
 */

import * as csso from 'csso';

export const name = 'minifyStyles';
export const description = 'minifies styles and removes unused styles';

/**
 * Minifies styles (<style> element + style attribute) using CSSO.
 *
 * @type {import('./plugins-types.js').Plugin<'minifyStyles'>}
 */
export const fn = (root, params, info) => {
  /** @type {Map<XastElement, XastParent>} */
  const styleElements = new Map();

  /** @type {Set<string>} */
  const tagsUsage = new Set();

  /** @type {Set<string>} */
  const idsUsage = new Set();

  /** @type {Set<string>} */
  const classesUsage = new Set();

  /**
   * Force to use usage data even if it unsafe. For example, the document
   * contains scripts or in attributes..
   */
  let forceUsageDeoptimized = false;

  const styleData = info.docData.getStyles();
  if (
    (!forceUsageDeoptimized && info.docData.hasScripts()) ||
    styleData === null ||
    !styleData.hasStyles()
  ) {
    return;
  }

  return {
    element: {
      enter: (node, parentList) => {
        // collect tags, ids and classes usage
        tagsUsage.add(node.name);
        if (node.attributes.id != null) {
          idsUsage.add(node.attributes.id.toString());
        }
        if (node.attributes.class != null) {
          for (const className of node.attributes.class
            .toString()
            .split(/\s+/)) {
            classesUsage.add(className);
          }
        }
        // collect style elements or elements with style attribute
        if (node.name === 'style' && node.children.length !== 0) {
          styleElements.set(node, parentList[parentList.length - 1].element);
        }

        if (node.attributes.style) {
          node.attributes.style = csso.minifyBlock(
            node.attributes.style.toString(),
            {},
          ).css;
        }
      },
    },

    root: {
      exit: () => {
        /** @type {{tags: string[];ids: string[];classes: string[];}} */
        const cssoUsage = {};

        cssoUsage.tags = Array.from(tagsUsage);
        cssoUsage.ids = Array.from(idsUsage);
        cssoUsage.classes = Array.from(classesUsage);

        styleData.minifyStyles(cssoUsage);
      },
    },
  };
};
