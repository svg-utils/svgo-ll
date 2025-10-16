import { LengthOrPctValue } from '../lib/attrs/lengthOrPct.js';
import { LengthValue } from '../lib/attrs/lengthValue.js';
import { PaintAttValue } from '../lib/attrs/paintAttValue.js';
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
              const id = element.attributes.id;
              if (id) {
                gradientIds.set(id.toString(), {
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
  const transform = props.get('transform');
  if (transform === undefined) {
    return;
  }

  // Don't transform if there is a clip-path.
  if (props.get('clip-path')) {
    return;
  }
  const fill = props.get('fill');
  if (fill && !canTransformFill(fill.value, gradientMap)) {
    return;
  }

  // @ts-ignore
  const funcs = transform.value.getTransforms();
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

  // @ts-ignore
  element.attributes.x = new LengthValue(newX);
  // @ts-ignore
  element.attributes.y = new LengthValue(newY);

  delete element.attributes.transform;

  const styleAtt = StyleAttValue.getAttValue(element);
  if (styleAtt) {
    styleAtt.delete('transform');
    styleAtt.updateElement(element);
  }
}

/**
 * @param {import('../lib/types.js').SVGAttValue} fill
 * @param {GradientMap} gradientMap
 * @returns {boolean}
 */
function canTransformFill(fill, gradientMap) {
  const attValue = PaintAttValue.getObj(fill);
  const url = attValue.getURL();
  if (url === undefined) {
    return true;
  }
  const id = url.getID();
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
  return gradient.element.attributes.gradientUnits !== 'userSpaceOnUse';
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} attName
 * @returns {number|null}
 */
function getPixelLength(element, attName) {
  const attValue = LengthOrPctValue.getAttValue(element, attName);
  if (attValue === undefined) {
    return 0;
  }
  if (typeof attValue === 'string') {
    return null;
  }
  return attValue.getPixels();
}
