import { ClassValue } from '../lib/attrs/classValue.js';
import { generateId } from '../lib/svgo/tools.js';

export const name = 'minifyClassNames';
export const description = 'minify class names';

/** @type {import('./plugins-types.js').Plugin<'minifyClassNames'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const referencedClassNames = new Map();

  return {
    element: {
      enter: (element) => {
        const cv = ClassValue.getAttValue(element);
        if (cv) {
          // Record existing class names.
          for (const className of cv.getClassNames()) {
            let elements = referencedClassNames.get(className);
            if (elements === undefined) {
              elements = [];
              referencedClassNames.set(className, elements);
            }
            elements.push(element);
          }
        }
      },
    },
    root: {
      exit: () => {
        /**
         * @returns {string}
         */
        function getNextId() {
          while (true) {
            const classId = generateId(classNameCounter++);
            return classId;
          }
        }

        let classNameCounter = 0;

        // Sort values by number of references so most-used classes have the shortest class names.
        const sortedStyles = Array.from(referencedClassNames.entries()).sort(
          (a, b) => b[1].length - a[1].length,
        );

        /** @type {Map<string,string>} */
        const renameMap = new Map();
        for (const [name] of sortedStyles) {
          renameMap.set(name, getNextId());
        }

        // Rename classes in elements.
        for (const [oldId, elements] of referencedClassNames.entries()) {
          const newId = renameMap.get(oldId);
          for (const element of elements) {
            const cv = ClassValue.getAttValue(element);
            // @ts-ignore
            cv.rename(oldId, newId);
          }
        }

        styleData.updateClassNames(renameMap);
      },
    },
  };
};
