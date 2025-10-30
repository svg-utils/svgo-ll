import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { AttValue } from '../lib/attrs/attValue.js';
import { HrefAttValue } from '../lib/attrs/hrefAttValue.js';
import { getSVGElement } from '../lib/tools-ast.js';
import { createElement } from '../lib/xast.js';

export const name = 'convertPathToUse';
export const description = 'convert identical paths to <use> elements';

/** @type {import('./plugins-types.js').Plugin<'convertPathToUse'>} */
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
      exit: (root) => {
        /** @type {{id:string,elements:import('../lib/types.js').XastElement[]}[]} */
        const newDefs = [];

        for (const elements of pathToElements.values()) {
          if (elements.length === 1) {
            continue;
          }

          newDefs.push({ id: 'a', elements: elements });
        }

        if (newDefs.length > 0) {
          const svg = getSVGElement(root);
          const defs = createElement(svg, 'defs');
          for (const def of newDefs) {
            const d = def.elements[0].svgAtts.getAtt('d');
            const atts = new SvgAttMap();
            atts.set('id', new AttValue(def.id));
            atts.set('d', d);
            createElement(defs, 'path', '', undefined, atts);

            for (const element of def.elements) {
              element.local = 'use';
              element.svgAtts.set('href', new HrefAttValue('#' + def.id));
              element.svgAtts.delete('d');
            }
          }
        }
      },
    },
  };
};
