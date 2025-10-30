export const name = 'convertShapeToUse';
export const description = 'convert identical paths to <use> elements';

/** @type {import('./plugins-types.js').Plugin<'convertShapeToUse'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const pathToElements = new Map();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        if (element.local !== 'path') {
          return;
        }

        /** @type {import('../types/types.js').PathAttValue|undefined} */
        const d = element.svgAtts.get('d');
        if (d === undefined) {
          return;
        }

        const str = d.toString();
        let elements = pathToElements.get(str);
        if (elements === undefined) {
          elements = [];
          pathToElements.set(str, elements);
        }
        elements.push(element);
      },
    },
    root: {
      exit: () => {
        for (const [d, elements] of pathToElements.entries()) {
          if (elements.length === 1) {
            continue;
          }

          console.log(`${d.substring(0.2)}: ${elements.length}`);
        }
      },
    },
  };
};
