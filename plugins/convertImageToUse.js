import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { AttValue } from '../lib/attrs/attValue.js';
import { HrefAttValue } from '../lib/attrs/hrefAttValue.js';
import { LengthPercentageAttValue } from '../lib/attrs/lengthPercentageAttValue.js';
import { ViewBoxAttValue } from '../lib/attrs/viewBoxAttValue.js';
import { ExactNum } from '../lib/exactnum.js';
import {
  addToMapArray,
  getBase64ImageDimensions,
  getNextId,
} from '../lib/svgo/tools.js';
import {
  deleteOtherAtt,
  getOtherAtt,
  getReferencedIds,
  getSVGElement,
  getXlinkHref,
  NS_XLINK,
} from '../lib/tools-ast.js';
import { createElement } from '../lib/xast.js';
import { USER_SPACE_PROPS } from './_collections.js';
import { getAllProperties } from './_styles.js';

export const name = 'convertImageToUse';
export const description = 'converts common images to <use> elements';

const TRANSFORM_PROP_NAMES = ['transform', 'x', 'y'];

/** @type {import('./plugins-types.js').Plugin<'convertImageToUse'>} */
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

        if (url === undefined || !url.startsWith('data:')) {
          return;
        }

        const preserveAspectRatio = element.svgAtts.get('preserveAspectRatio');
        if (
          preserveAspectRatio !== undefined &&
          preserveAspectRatio.toString() !== 'xMidYMid meet'
        ) {
          // We could partition these by preserveAspectRatio value, but this is probably a rare use case; for
          // now just bail if it's not the default value.
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

          const intrinsicDimensions = getBase64ImageDimensions(url);
          if (intrinsicDimensions === undefined) {
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
              new ExactNum(intrinsicDimensions.width),
              new ExactNum(intrinsicDimensions.height),
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
          imageAtts.set(
            'width',
            new LengthPercentageAttValue(intrinsicDimensions.width.toString()),
          );
          imageAtts.set(
            'height',
            new LengthPercentageAttValue(intrinsicDimensions.height.toString()),
          );
          imageAtts.set('href', new HrefAttValue(url));
          createElement(symbolElement, 'image', '', undefined, imageAtts);

          for (const element of elements) {
            const props = getAllProperties(element);

            // Check to see if the image has properties that will cause problems if directly on the <use> -
            // see https://svgwg.org/svg2-draft/struct.html#UseLayout
            if (needsGroup(props)) {
              convertToGroup(element, props, id);
              continue;
            }

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

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').SvgAttValues} props
 * @param {string} id
 */
function convertToGroup(element, props, id) {
  const useAtts = new SvgAttMap();

  // Figure out which attributes need to be moved.
  /** @type {import('../types/types.js').StyleAttValue|undefined} */
  const styleAtt = element.svgAtts.get('style');
  for (const [propName, propValue] of props.entries()) {
    if (USER_SPACE_PROPS.includes(propName) || propName === 'transform') {
      continue;
    }
    useAtts.set(propName, propValue);
    element.svgAtts.delete(propName);
    if (styleAtt) {
      styleAtt.delete(propName);
    }
  }

  // Change the href
  useAtts.set('href', new HrefAttValue('#' + id));
  // If there's an xlink:href, remove it.
  const xlinkHref = getXlinkHref(element);
  if (xlinkHref) {
    deleteOtherAtt(element, xlinkHref);
  }

  // Change the <image> element to a <g>.
  element.local = 'g';

  // Create <use> as child of <g>.
  createElement(element, 'use', '', undefined, useAtts);
}

/**
 * @param {import('../lib/types.js').SvgAttValues} props
 * @returns {boolean}
 */
function needsGroup(props) {
  if (
    !USER_SPACE_PROPS.some((propName) => {
      const value = props.get(propName);
      return !!value;
    })
  ) {
    return false;
  }

  // See if there are any transforms.
  return TRANSFORM_PROP_NAMES.some(
    (propName) => props.get(propName) !== undefined,
  );
}
