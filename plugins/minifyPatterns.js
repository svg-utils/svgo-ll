export const name = 'minifyPatterns';
export const description =
  'merge pattern elements and remove unused attributes';

/**
 * @typedef {{color:import('../types/types.js').ColorAttValue,opacity:import('../lib/types.js').AttValue|undefined}} ColorData
 */

/** @type {import('./plugins-types.js').Plugin<'minifyPatterns'>}; */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }
      },
    },
    root: {
      exit: () => {},
    },
  };
};
