import { getStyleAttValue, getStyleDeclarations } from '../lib/css-tools.js';
import { LengthOrPctValue } from '../lib/lengthOrPct.js';
import { OpacityValue } from '../lib/opacity.js';
import { writeStyleAttribute } from '../lib/svgo/tools.js';
import { visitSkip } from '../lib/xast.js';
import {
  elemsGroups,
  geometryProperties,
  presentationProperties,
  uselessShapeProperties,
} from './_collections.js';

export const name = 'cleanupStyleAttributes';
export const description = 'removes invalid properties from style attributes';

const CLASS_SPLITTER = /\s/;

/**
 * @type {import('./plugins-types.js').Plugin<'cleanupStyleAttributes'>}
 */
export const fn = (info) => {
  /**
   * @param {import('../lib/types.js').XastElement} element
   * @param {import('../lib/types.js').StyleData} styleData
   */
  function cleanupClassAttributes(element, styleData) {
    if (hasClassAttributeSelector) {
      return;
    }
    // If there is a class attribute, delete any classes not referenced in the style element.
    const classStr = element.attributes.class;
    if (!classStr) {
      return;
    }

    const classes = classStr.toString().split(CLASS_SPLITTER);
    const newClasses = classes.filter((c) => styleData.hasClassReference(c));
    if (newClasses.length === 0) {
      delete element.attributes.class;
    } else {
      element.attributes.class = newClasses.join(' ');
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
   *
   * @param {import('../lib/types.js').XastElement} element
   */
  function hasOnlyShapeChildren(element) {
    return element.children.every(
      (child) => child.type === 'element' && elemsGroups.shape.has(child.name),
    );
  }

  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  const hasClassAttributeSelector = styleData.hasAttributeSelector('class');
  const hasStyleAttributeSelector = styleData.hasAttributeSelector('style');

  return {
    element: {
      enter: (element) => {
        if (element.name === 'foreignObject') {
          return visitSkip;
        }

        cleanupClassAttributes(element, styleData);

        if (hasStyleAttributeSelector) {
          return;
        }

        const attValue = getStyleAttValue(element);
        if (attValue === undefined) {
          return;
        }

        const origProperties = getStyleDeclarations(element);
        if (!origProperties) {
          return;
        }

        const newProperties = new Map();

        if (elemsGroups.animation.has(element.name)) {
          // Style attributes have no effect on animation elements.
          writeStyleAttribute(element, newProperties);
          return;
        }

        const isShapeGroup =
          element.name === 'g' && hasOnlyShapeChildren(element);
        for (const [p, v] of origProperties.entries()) {
          if (!elementCanHaveProperty(element.name, p)) {
            continue;
          }
          if (isShapeGroup && uselessShapeProperties.has(p)) {
            continue;
          }
          let newValue = v;
          switch (p) {
            case 'font-size':
            case 'stroke-dashoffset':
            case 'stroke-width':
              {
                const parsedValue = LengthOrPctValue.getLengthOrPctObj(v.value);
                const minified = parsedValue.getMinifiedValue();
                newValue.value = minified;
              }
              break;
            case 'fill-opacity':
            case 'opacity':
            case 'stop-opacity':
            case 'stroke-opacity':
              {
                newValue.value = OpacityValue.getOpacityObj(v.value);
              }
              break;
          }
          newProperties.set(p, newValue);
        }
        writeStyleAttribute(element, newProperties);
      },
    },
  };
};
