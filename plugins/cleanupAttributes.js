import { ClassAttValue } from '../lib/attrs/classAttValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
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

        for (const attName of element.svgAtts.keys()) {
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
  const cv = ClassAttValue.getAttValue(element);
  if (cv === undefined) {
    return;
  }

  for (const className of cv.getClassNames()) {
    if (!styleData.hasClassReference(className)) {
      cv.delete(className);
    }
  }

  if (cv.getClassNames().length === 0) {
    element.svgAtts.delete('class');
  }
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
    element.svgAtts.delete('style');
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

  styleAttValue.updateElement(element);
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
    (child) => child.type === 'element' && elemsGroups.shape.has(child.local),
  );
}
