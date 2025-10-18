import { ClassAttValue } from '../lib/attrs/classAttValue.js';
import { generateId } from '../lib/svgo/tools.js';
import { getOtherAtt } from '../lib/tools-ast.js';

export const name = 'minifyClassNames';
export const description = 'minify class names';

/** @type {import('./plugins-types.js').Plugin<'minifyClassNames'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector('class')
  ) {
    return;
  }

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const referencedClassNames = new Map();

  /** @type {Set<string>} */
  const preservedClassNames = new Set();

  for (const className of styleData.getReferencedClasses()) {
    referencedClassNames.set(className, []);
  }

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          // If there's a class, record the classes so that they aren't overwritten.
          const att = getOtherAtt(element, 'class', '');
          if (att) {
            const cv = new ClassAttValue(att.value);
            for (const className of cv.getClassNames()) {
              preservedClassNames.add(className);
            }
          }
          return;
        }

        const cv = ClassAttValue.getAttValue(element);
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
            if (!preservedClassNames.has(classId)) {
              return classId;
            }
          }
        }

        if (referencedClassNames.size === 0) {
          return;
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
            const cv = ClassAttValue.getAttValue(element);
            // @ts-ignore
            cv.rename(oldId, newId);
          }
        }

        styleData.updateClassNames(renameMap);
      },
    },
  };
};
