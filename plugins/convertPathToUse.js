import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { AttValue } from '../lib/attrs/attValue.js';
import { HrefAttValue } from '../lib/attrs/hrefAttValue.js';
import { generateId } from '../lib/svgo/tools.js';
import {
  getHrefId,
  getReferencedIds,
  getSVGElement,
} from '../lib/tools-ast.js';
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

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const clipPathUses = new Map();

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

        if (
          element.local === 'use' &&
          element.parentNode.type === 'element' &&
          element.parentNode.local === 'clipPath'
        ) {
          // If it's a child of a <clipPath>, record the id to make sure we maintain direct references.
          const hrefId = getHrefId(element);
          if (hrefId === undefined) {
            return;
          }
          addToMapArray(clipPathUses, hrefId, element);
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
        addToMapArray(pathToElements, str, element);
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

              // If there is a <use> in a <clipPath> that references this <path>, reset the reference so it directly
              // references the new path - see https://drafts.fxtf.org/css-masking/#ClipPathElement
              const pathId = element.svgAtts.get('id')?.toString();
              if (pathId !== undefined) {
                const elements = clipPathUses.get(pathId);
                if (elements !== undefined) {
                  elements.forEach((element) => {
                    element.svgAtts.set('href', new HrefAttValue('#' + def.id));
                  });
                }
              }
            }
          }
        }
      },
    },
  };
};

/**
 * @template T
 * @param {Map<string,T[]>} map
 * @param {string} key
 * @param {T} item
 */
function addToMapArray(map, key, item) {
  let array = map.get(key);
  if (array === undefined) {
    array = [];
    map.set(key, array);
  }
  array.push(item);
}

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
