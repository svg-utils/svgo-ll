export const name = 'cleanupTextElements';
export const description = 'simplify <text> and <tspan> elements';

/**
 * @type {import('./plugins-types.js').Plugin<'cleanupTextElements'>}
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        if (element.name !== 'text') {
          return;
        }
      },
    },
  };
};
