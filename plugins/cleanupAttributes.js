import { ClassValue } from '../lib/attrs/classValue.js';
import { LengthPercentageAttValue } from '../lib/attrs/lengthPercentageAttValue.js';
import { ListOfLengthPercentageAttValue } from '../lib/attrs/listOfLengthPercentageAttValue.js';
import { OpacityValue } from '../lib/attrs/opacityValue.js';
import { PaintAttValue } from '../lib/attrs/paintAttValue.js';
import { StdDeviationValue } from '../lib/attrs/stdDeviationValue.js';
import { StrokeDasharrayAttValue } from '../lib/attrs/strokeDashArrayAttValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { TextSpacingAttValue } from '../lib/attrs/textSpacingAttValue.js';
import { ViewBoxValue } from '../lib/attrs/viewBoxValue.js';
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
        if (element.uri !== undefined) {
          return;
        }

        if (element.local === 'foreignObject') {
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
            case 'fill':
            case 'stroke':
              PaintAttValue.getAttValue(element, attName);
              break;
            case 'fill-opacity':
            case 'opacity':
            case 'stop-opacity':
            case 'stroke-opacity':
              cleanupOpacityAttribute(element, attName);
              break;
            case 'x1':
            case 'x2':
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
            case 'stroke-width':
              cleanupLengthPct(element, attName);
              break;
            case 'x':
            case 'y':
              {
                switch (element.local) {
                  case 'text':
                  case 'tspan':
                    ListOfLengthPercentageAttValue.getAttValue(
                      element,
                      attName,
                    );
                    break;
                  default:
                    cleanupLengthPct(element, attName);
                    break;
                }
              }
              break;
            case 'stdDeviation':
              StdDeviationValue.getAttValue(element);
              break;
            case 'href':
              cleanupHref(element);
              break;
            case 'stroke-dasharray':
              StrokeDasharrayAttValue.getAttValue(element);
              break;
            case 'viewBox':
              ViewBoxValue.getAttValue(element);
              break;
            case 'letter-spacing':
            case 'word-spacing':
              TextSpacingAttValue.getAttValue(element, attName);
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
 */
function cleanupHref(element) {
  const href = element.attributes.href;
  if (typeof href === 'string' && href.startsWith('data:')) {
    element.attributes.href = href.replaceAll('\n', '');
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} attName
 */
function cleanupLengthPct(element, attName) {
  LengthPercentageAttValue.getAttValue(element, attName);
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
  const styleAttValue = StyleAttValue.getAttValue(element);
  if (styleAttValue === undefined) {
    return;
  }

  if (elemsGroups.animation.has(element.local)) {
    // Style attributes have no effect on animation elements.
    delete element.attributes.style;
    return;
  }

  const isShapeGroup = element.local === 'g' && hasOnlyShapeChildren(element);
  for (const p of styleAttValue.keys()) {
    if (!elementCanHaveProperty(element.local, p)) {
      styleAttValue.delete(p);
      continue;
    }
    if (isShapeGroup && uselessShapeProperties.has(p)) {
      styleAttValue.delete(p);
      continue;
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

  // "marker" is allowed as a style property but not as an attribute.
  if (propName === 'marker') {
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
    (child) => child.type === 'element' && elemsGroups.shape.has(child.local),
  );
}
