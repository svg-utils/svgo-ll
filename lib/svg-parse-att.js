import { transform2js } from '../plugins/_transforms.js';
import { ExactNum } from './exactnum.js';

/**
 * @param {import('./types.js').SVGAttValue} attValue
 * @returns {import('./types-svg-attr.js').SVGTransformFn[]|null}
 */
export function svgGetTransform(attValue) {
  if (!attValue.parsedVal) {
    if (attValue.strVal === undefined) {
      throw new Error();
    }
    attValue.parsedVal = {
      type: 'transform',
      value: svgParseTransform(attValue.strVal),
    };
  }
  return attValue.parsedVal.value;
}

/**
 * @param {string} str
 * @returns {import('./types-svg-attr.js').SVGTransformFn[]}
 */
export function svgParseTransform(str) {
  const genericTransforms = transform2js(str);
  /** @type {import('./types-svg-attr.js').SVGTransformFn[]} */
  const transforms = [];
  for (const t of genericTransforms) {
    switch (t.name) {
      case 'rotate':
        transforms.push({ name: 'rotate', a: new ExactNum(t.data[0]) });
        break;
      default:
        throw new Error();
    }
  }
  return transforms;
}

/**
 * @param {import('./types-svg-attr.js').SVGTransformFn[]} transforms
 * @returns {string}
 */
export function svgStringifyTransform(transforms) {
  /**
   * @param {import('./types-svg-attr.js').SVGTransformFn} transform
   */
  function stringify(transform) {
    switch (transform.name) {
      case 'rotate':
        return `rotate(${transform.a.getMinifiedString()})`;
      default:
        throw new Error();
    }
  }
  return transforms.reduce(
    (str, transform) => (str += stringify(transform)),
    '',
  );
}

/**
 * @param {import('./types.js').SVGAttValue} attValue
 * @returns {string}
 */
export function svgToString(attValue) {
  if (!attValue.strVal) {
    if (attValue.parsedVal === undefined || attValue.parsedVal.value === null) {
      throw new Error();
    }
    switch (attValue.parsedVal.type) {
      case 'transform':
        attValue.strVal = svgStringifyTransform(attValue.parsedVal.value);
        break;
      default:
        throw new Error();
    }
  }
  return attValue.strVal;
}
