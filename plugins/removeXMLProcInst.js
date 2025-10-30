import { visitSkip } from '../lib/xast.js';

export const name = 'removeXMLProcInst';
export const description = 'removes XML processing instructions';

/**
 * Remove XML Processing Instruction.
 *
 * @example
 * <?xml version="1.0" encoding="utf-8"?>
 *
 * @type {import('./plugins-types.js').Plugin<'removeXMLProcInst'>}
 */
export const fn = () => {
  return {
    root: {
      enter: (root) => {
        root.children = root.children.filter(
          (child) => child.type !== 'instruction' || child.name !== 'xml',
        );
        return visitSkip;
      },
    },
  };
};
