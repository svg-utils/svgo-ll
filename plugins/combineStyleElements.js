export const name = 'combineStyleElements';
export const description = 'merge multiple style elements';

/**
 * @type {import('./plugins-types.js').Plugin<'cleanupStyleElements'>}
 */
export const fn = (info) => {
  if (info.docData.hasScripts()) {
    return;
  }
  const styles = info.docData.getStyles();
  if (styles === null) {
    return;
  }

  styles.mergeStyles();
};
