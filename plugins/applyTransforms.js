import { LengthOrPctValue } from '../lib/attrs/lengthOrPct.js';
import { LengthValue } from '../lib/attrs/lengthValue.js';
import { ExactNum } from '../lib/exactnum.js';
import { getTransformValue } from './_styles.js';

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

  return {
    element: {
      exit: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        switch (element.local) {
          case 'rect':
            applyToRect(element);
            return;
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 */
function applyToRect(element) {
  const transform = getTransformValue(element);
  if (transform === undefined) {
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

  // @ts-ignore
  element.attributes.x = new LengthValue(newX);
  // @ts-ignore
  element.attributes.y = new LengthValue(newY);

  delete element.attributes.transform;
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
