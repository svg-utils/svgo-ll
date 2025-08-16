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
        if (element.attributes['xlink:href']) {
          if (!element.attributes.href) {
            element.attributes.href = element.attributes['xlink:href'];
          }
          delete element.attributes['xlink:href'];
        }
      },
    },
  };
};
