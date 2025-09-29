import { elemsGroups } from './_collections.js';

export const name = 'cleanupTextNodes';
export const description = 'removes unnecessary text nodes';

const elementsToIgnore = new Set(elemsGroups.characterData);
['script', 'style'].forEach((element) => {
  elementsToIgnore.add(element);
});

/** @type {import('./plugins-types.js').Plugin<'cleanupTextNodes'>} */
export const fn = () => {
  return {
    element: {
      enter: (element) => {
        // Don't remove text nodes from non-SVG elements or elements which allow character data.

        if (
          !element.name.includes(':') &&
          !elementsToIgnore.has(element.name)
        ) {
          element.children = element.children.filter(
            (child) => child.type !== 'text',
          );
        }
        // element.children = element.children.filter(
        //   (child) => child.type !== 'text' || !/^\s*$/.test(child.value),
        // );
      },
    },
  };
};
