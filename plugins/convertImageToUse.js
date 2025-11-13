import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { AttValue } from '../lib/attrs/attValue.js';
import { HrefAttValue } from '../lib/attrs/hrefAttValue.js';
import { ViewBoxAttValue } from '../lib/attrs/viewBoxAttValue.js';
import { ExactNum } from '../lib/exactnum.js';
import { addToMapArray, getNextId } from '../lib/svgo/tools.js';
import {
  deleteOtherAtt,
  getOtherAtt,
  getReferencedIds,
  getSVGElement,
  getXlinkHref,
  NS_XLINK,
} from '../lib/tools-ast.js';
import { createElement } from '../lib/xast.js';

export const name = 'convertImageToUse';
export const description = 'converts common images to <use> elements';

/** @type {import('./plugins-types.js').Plugin<'convertImageToUse'>} */
export const fn = () => {
  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const images = new Map();

  /** @type {Set<string>} */
  const currentIds = new Set();

  /** @type {import('../lib/types.js').XastElement|undefined} */
  let defsElement;

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          // Not in SVG namespace.
          return;
        }

        const id = element.svgAtts.get('id')?.toString();
        if (id) {
          currentIds.add(id);
        }
        getReferencedIds(element).forEach((info) => currentIds.add(info.id));

        switch (element.local) {
          case 'defs':
            defsElement = element;
            return;
          case 'image':
            break;
          default:
            return;
        }

        const href = element.svgAtts.get('href');
        const url =
          href === undefined
            ? getOtherAtt(element, 'href', NS_XLINK)?.value
            : href.toString();

        if (url === undefined) {
          return;
        }

        addToMapArray(images, url, element);
      },
    },
    root: {
      exit: (root) => {
        let counter = 0;

        for (const [url, elements] of images.entries()) {
          if (elements.length === 1) {
            continue;
          }

          if (defsElement === undefined) {
            const svg = getSVGElement(root);
            defsElement = createElement(svg, 'defs');
          }

          const info = getNextId(counter, currentIds);
          counter = info.nextCounter;
          const id = info.nextId;

          /** @type {import('../types/types.js').LengthPercentageAttValue|undefined} */
          const width = elements[0].svgAtts.get('width');
          /** @type {import('../types/types.js').LengthPercentageAttValue|undefined} */
          const height = elements[0].svgAtts.get('height');

          if (height === undefined || width === undefined) {
            throw new Error();
          }

          const pxWidth = width.getPixels();
          const pxHeight = height.getPixels();

          if (pxWidth === null || pxHeight === null) {
            throw new Error();
          }

          // Create new <symbol>.
          const symbolAtts = new SvgAttMap();
          symbolAtts.set('id', new AttValue(id));
          symbolAtts.set(
            'viewBox',
            new ViewBoxAttValue([
              ExactNum.zero(),
              ExactNum.zero(),
              new ExactNum(pxWidth),
              new ExactNum(pxHeight),
            ]),
          );
          const symbolElement = createElement(
            defsElement,
            'symbol',
            '',
            undefined,
            symbolAtts,
          );

          const imageAtts = new SvgAttMap();
          imageAtts.set('width', width);
          imageAtts.set('height', height);
          imageAtts.set('href', new HrefAttValue(url));
          createElement(symbolElement, 'image', '', undefined, imageAtts);

          for (const element of elements) {
            element.local = 'use';
            element.svgAtts.set('href', new HrefAttValue('#' + id));
            // If there's an xlink:href, remove it.
            const xlinkHref = getXlinkHref(element);
            if (xlinkHref) {
              deleteOtherAtt(element, xlinkHref);
            }
          }
        }
      },
    },
  };
};
