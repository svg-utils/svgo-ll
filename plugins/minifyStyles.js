import { ClassAttValue } from '../lib/attrs/classAttValue.js';

export const name = 'minifyStyles';
export const description = 'minifies styles and removes unused styles';

/**
 * Minifies styles (<style> element + style attribute) using CSSO.
 *
 * @type {import('./plugins-types.js').Plugin<'minifyStyles'>}
 */
export const fn = (info) => {
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
      enter: (element) => {
        // collect tags, ids and classes usage
        tagsUsage.add(element.local);
        const id = element.svgAtts.get('id')?.toString();
        if (id !== undefined) {
          idsUsage.add(id);
        }
        const classAtt = ClassAttValue.getAttValue(element);
        if (classAtt !== undefined) {
          for (const className of classAtt.getClassNames()) {
            classesUsage.add(className);
          }
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
