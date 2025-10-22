import { LengthAttValue } from '../lib/attrs/lengthAttValue.js';
import { LengthPercentageAttValue } from '../lib/attrs/lengthPercentageAttValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { ExactNum } from '../lib/exactnum.js';
import { getHrefId } from '../lib/tools-ast.js';
import { getPresentationProperties } from './_styles.js';

/** @typedef {Map<string,{element:import('../lib/types.js').XastElement,href:string|undefined}>} GradientMap */

export const name = 'applyTransforms';
export const description = 'merge transforms with shape elements';

/** @type {import('./plugins-types.js').Plugin<'applyTransforms'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  /** @type {import('../lib/types.js').XastElement[]} */
  const elementsToCheck = [];

  /** @type {GradientMap} */
  const gradientIds = new Map();

  return {
    element: {
      exit: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        switch (element.local) {
          case 'rect':
            elementsToCheck.push(element);
            return;
          case 'linearGradient':
          case 'radialGradient':
            {
              const id = element.svgAtts.get('id')?.toString();
              if (id) {
                gradientIds.set(id, {
                  element: element,
                  href: getHrefId(element),
                });
              }
            }
            return;
        }
      },
    },
    root: {
      exit: () => {
        for (const element of elementsToCheck) {
          switch (element.local) {
            case 'rect':
              applyToRect(element, gradientIds);
              return;
          }
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {GradientMap} gradientMap
 */
function applyToRect(element, gradientMap) {
  const props = getPresentationProperties(element);
  /** @type {import('../types/types.js').TransformAttValue|undefined} */
  const transform = props.get('transform');
  if (transform === undefined) {
    return;
  }

  // Don't transform if there is a clip-path.
  if (props.get('clip-path')) {
    return;
  }
  /** @type {import('../types/types.js').PaintAttValue|undefined} */
  const fill = props.get('fill');
  if (fill && !canTransformFill(fill, gradientMap)) {
    return;
  }

  const funcs = transform.getTransforms();
  if (funcs.length !== 1) {
    return;
  }
  const func = funcs[0];
  if (func.name !== 'translate') {
    return;
  }
  if (func.x.unit !== 'px' || func.y.unit !== 'px') {
    return;
  }
  const x = getPixelLength(element, 'x');
  const y = getPixelLength(element, 'y');
  if (x === null || y === null) {
    return;
  }

  const newX = func.x.n.add(new ExactNum(x));
  const newY = func.y.n.add(new ExactNum(y));
  if (newX === undefined || newY === undefined) {
    return;
  }

  element.svgAtts.set('x', new LengthAttValue(newX));
  element.svgAtts.set('y', new LengthAttValue(newY));
  element.svgAtts.delete('transform');

  const styleAtt = StyleAttValue.getAttValue(element);
  if (styleAtt) {
    styleAtt.delete('transform');
    styleAtt.updateElement(element);
  }
}

/**
 * @param {import('../types/types.js').PaintAttValue} fill
 * @param {GradientMap} gradientMap
 * @returns {boolean}
 */
function canTransformFill(fill, gradientMap) {
  const url = fill.getURL();
  if (url === undefined) {
    return true;
  }
  const id = url.getReferencedID();
  if (id === undefined) {
    return false;
  }
  return canTransformGradient(gradientMap, id);
}

/**
 * @param {GradientMap} gradientMap
 * @param {string} id
 * @returns {boolean}
 */
function canTransformGradient(gradientMap, id) {
  const gradient = gradientMap.get(id);
  if (gradient === undefined) {
    return false;
  }
  if (gradient.href) {
    return canTransformGradient(gradientMap, gradient.href);
  }
  return (
    gradient.element.svgAtts.get('gradientUnits')?.toString() !==
    'userSpaceOnUse'
  );
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} attName
 * @returns {number|null}
 */
function getPixelLength(element, attName) {
  const attValue = LengthPercentageAttValue.getAttValue(element, attName);
  if (attValue === undefined) {
    return 0;
  }
  if (typeof attValue === 'string') {
    return null;
  }
  return attValue.getPixels();
}
