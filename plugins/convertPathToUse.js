import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { AttValue } from '../lib/attrs/attValue.js';
import { HrefAttValue } from '../lib/attrs/hrefAttValue.js';
import { addToMapArray, getNextId } from '../lib/svgo/tools.js';
import {
  getHrefId,
  getParentName,
  getReferencedIds2,
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
        getReferencedIds2(element).forEach((info) => currentIds.add(info.id));

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
        /** @type {{id:string,create:boolean,elements:import('../lib/types.js').XastElement[]}[]} */
        const newDefs = [];

        let counter = 0;

        for (const elements of pathToElements.values()) {
          if (elements.length === 1) {
            continue;
          }

          // Estimate savings. It's usually worth combining paths, unless there are a small number of very short ones.
          const len = elements[0].svgAtts.getAtt('d').toString().length;
          if ((elements.length - 1) * len < 25) {
            continue;
          }

          const existingDefs = findExistingDefs(elements);

          if (existingDefs.length > 0) {
            newDefs.push({
              id: existingDefs[0],
              create: false,
              elements: elements,
            });
          } else {
            const info = getNextId(counter, currentIds);
            counter = info.nextCounter;
            newDefs.push({ id: info.nextId, create: true, elements: elements });
          }
        }

        if (newDefs.length > 0) {
          if (defsElement === undefined) {
            const svg = getSVGElement(root);
            defsElement = createElement(svg, 'defs');
          }
          for (const def of newDefs) {
            if (def.create) {
              const d = def.elements[0].svgAtts.getAtt('d');
              const atts = new SvgAttMap();
              atts.set('id', new AttValue(def.id));
              atts.set('d', d);
              createElement(defsElement, 'path', '', undefined, atts);
            }

            for (const element of def.elements) {
              const id = element.svgAtts.get('id')?.toString();
              if (id === def.id) {
                // This is an existing element; don't change it.
                continue;
              }

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
 * @param {import('../lib/types.js').XastElement[]} elements
 * @returns {string[]}
 */
function findExistingDefs(elements) {
  /** @type {string[]} */
  const defPaths = [];
  for (const element of elements) {
    const parentName = getParentName(element);
    if (parentName !== 'clipPath' && parentName !== 'defs') {
      continue;
    }
    if (element.svgAtts.count() !== 2) {
      continue;
    }
    const id = element.svgAtts.get('id')?.toString();
    if (id === undefined) {
      continue;
    }
    if (element.svgAtts.get('d') === undefined) {
      continue;
    }
    defPaths.push(id);
  }
  return defPaths;
}
