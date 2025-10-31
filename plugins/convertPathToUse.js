import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { AttValue } from '../lib/attrs/attValue.js';
import { HrefAttValue } from '../lib/attrs/hrefAttValue.js';
import { generateId } from '../lib/svgo/tools.js';
import { getReferencedIds, getSVGElement } from '../lib/tools-ast.js';
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

  /** @type {Set<string>} */
  const currentIds = new Set();

  /** @type {import('../lib/types.js').XastElement|undefined} */
  let defsElement;

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        const id = element.svgAtts.get('id')?.toString();
        if (id) {
          currentIds.add(id);
        }
        getReferencedIds(element).forEach((info) => currentIds.add(info.id));

        if (element.local === 'defs') {
          defsElement = element;
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

        let counter = 0;

        for (const elements of pathToElements.values()) {
          if (elements.length === 1) {
            continue;
          }

          const info = getNextId(counter, currentIds);
          counter = info.nextCounter;
          newDefs.push({ id: info.nextId, elements: elements });
        }

        if (newDefs.length > 0) {
          if (defsElement === undefined) {
            const svg = getSVGElement(root);
            defsElement = createElement(svg, 'defs');
          }
          for (const def of newDefs) {
            const d = def.elements[0].svgAtts.getAtt('d');
            const atts = new SvgAttMap();
            atts.set('id', new AttValue(def.id));
            atts.set('d', d);
            createElement(defsElement, 'path', '', undefined, atts);

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

/**
 * @param {number} counter
 * @param {Set<string>} currentIds
 * @returns {{nextId:string, nextCounter:counter}}
 */
function getNextId(counter, currentIds) {
  let nextId;
  do {
    nextId = generateId(counter++);
  } while (currentIds.has(nextId));

  return { nextId: nextId, nextCounter: counter };
}
