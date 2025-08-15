import { detachNodeFromParent, visitSkip } from '../lib/xast.js';

export const name = 'removeXMLProcInst';
export const description = 'removes XML processing instructions';

/**
 * Remove XML Processing Instruction.
 *
 * @example
 * <?xml version="1.0" encoding="utf-8"?>
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types.js').Plugin<'removeXMLProcInst'>}
 */
export const fn = () => {
  return {
    instruction: {
      enter: (instruction) => {
        if (instruction.name === 'xml') {
          detachNodeFromParent(instruction);
        }
      },
    },
    element: { enter: () => visitSkip },
  };
};
