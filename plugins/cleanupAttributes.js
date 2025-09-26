import { ClassValue } from '../lib/attrs/classValue.js';
import { FontSizeValue } from '../lib/attrs/fontSizeValue.js';
import { LengthOrPctValue } from '../lib/attrs/lengthOrPct.js';
import { OpacityValue } from '../lib/attrs/opacityValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { visitSkip } from '../lib/xast.js';
import {
  elemsGroups,
  geometryProperties,
  presentationProperties,
  uselessShapeProperties,
} from './_collections.js';

export const name = 'cleanupAttributes';
export const description =
  'removes invalid properties from style attributes and standardizes attribute values';

/** @type {import('./plugins-types.js').Plugin<'cleanupAttributes'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        if (element.name === 'foreignObject') {
          return visitSkip;
        }

        for (const attName of Object.keys(element.attributes)) {
          if (styleData.hasAttributeSelector(attName)) {
            continue;
          }
          switch (attName) {
            case 'class':
              cleanupClassAttribute(element, styleData);
              break;
            case 'style':
              cleanupStyleAttribute(element);
              break;
            case 'fill-opacity':
            case 'opacity':
            case 'stop-opacity':
            case 'stroke-opacity':
              cleanupOpacityAttribute(element, attName);
              break;
            case 'x':
            case 'x1':
            case 'x2':
            case 'y':
            case 'y1':
            case 'y2':
            case 'width':
            case 'height':
            case 'cx':
            case 'cy':
            case 'r':
            case 'rx':
            case 'ry':
            case 'fx':
            case 'fy':
            case 'fr':
            case 'stdDeviation':
              cleanupLengthPct(element, attName);
              break;
          }
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').StyleData} styleData
 */
function cleanupClassAttribute(element, styleData) {
  // If there is a class attribute, delete any classes not referenced in the style element.
  const cv = ClassValue.getAttValue(element);
  if (cv === undefined) {
    return;
  }

  for (const className of cv.getClassNames()) {
    if (!styleData.hasClassReference(className)) {
      cv.delete(className);
    }
  }

  if (cv.getClassNames().length === 0) {
    delete element.attributes.class;
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} attName
 */
function cleanupLengthPct(element, attName) {
  LengthOrPctValue.getAttValue(element, attName);
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} attName
 */
function cleanupOpacityAttribute(element, attName) {
  OpacityValue.getAttValue(element, attName);
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {void}
 */
function cleanupStyleAttribute(element) {
  const styleAttValue = StyleAttValue.getStyleAttValue(element);
  if (styleAttValue === undefined) {
    return;
  }

  if (elemsGroups.animation.has(element.name)) {
    // Style attributes have no effect on animation elements.
    delete element.attributes.style;
    return;
  }

  const isShapeGroup = element.name === 'g' && hasOnlyShapeChildren(element);
  for (const [p, v] of styleAttValue.entries()) {
    if (!elementCanHaveProperty(element.name, p)) {
      styleAttValue.delete(p);
      continue;
    }
    if (isShapeGroup && uselessShapeProperties.has(p)) {
      styleAttValue.delete(p);
      continue;
    }
    switch (p) {
      case 'letter-spacing':
      case 'stroke-dashoffset':
      case 'stroke-width':
        {
          const parsedValue = LengthOrPctValue.getLengthOrPctObj(v.value);
          styleAttValue.set(p, {
            value: parsedValue,
            important: v.important,
          });
        }
        break;
      case 'fill-opacity':
      case 'opacity':
      case 'stop-opacity':
      case 'stroke-opacity':
        styleAttValue.set(p, {
          value: OpacityValue.getObj(v.value),
          important: v.important,
        });
        break;
      case 'font-size':
        styleAttValue.set(p, {
          value: FontSizeValue.getObj(v.value),
          important: v.important,
        });
        break;
    }
  }

  if (styleAttValue.isEmpty()) {
    delete element.attributes.style;
  }
}

/**
 * @param {string} elName
 * @param {string} propName
 */
function elementCanHaveProperty(elName, propName) {
  const isUniversalProperty = presentationProperties.has(propName);

  if (isUniversalProperty) {
    // See if it is excluded from this element.
    if (elemsGroups.shape.has(elName)) {
      if (uselessShapeProperties.has(propName)) {
        return false;
      }
    }
    return true;
  }

  // See if it is allowed for this element.
  const allowedElements = geometryProperties[propName];
  return allowedElements && allowedElements.has(elName);
}

/**
 * @param {import('../lib/types.js').XastElement} element
 */
function hasOnlyShapeChildren(element) {
  return element.children.every(
    (child) => child.type === 'element' && elemsGroups.shape.has(child.name),
  );
}
