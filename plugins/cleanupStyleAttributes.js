import { LengthOrPctValue } from '../lib/lengthOrPct.js';
import { OpacityValue } from '../lib/opacity.js';
import { StyleAttValue } from '../lib/styleAttValue.js';
import { getClassNames } from '../lib/svgo/tools.js';
import { visitSkip } from '../lib/xast.js';
import {
  elemsGroups,
  geometryProperties,
  presentationProperties,
  uselessShapeProperties,
} from './_collections.js';

export const name = 'cleanupStyleAttributes';
export const description = 'removes invalid properties from style attributes';

/** @type {import('./plugins-types.js').Plugin<'cleanupStyleAttributes'>} */
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

    const classes = getClassNames(element);
    if (classes.length === 0) {
      return;
    }

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

        const styleAttValue = StyleAttValue.getStyleAttValue(element);
        if (styleAttValue === undefined) {
          return;
        }

        if (elemsGroups.animation.has(element.name)) {
          // Style attributes have no effect on animation elements.
          delete element.attributes.style;
          return;
        }

        const isShapeGroup =
          element.name === 'g' && hasOnlyShapeChildren(element);
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
            case 'font-size':
            case 'stroke-dashoffset':
            case 'stroke-width':
              {
                const parsedValue = LengthOrPctValue.getLengthOrPctObj(v.value);
                const minified = parsedValue.getMinifiedValue();
                styleAttValue.set(p, {
                  value: minified,
                  important: v.important,
                });
              }
              break;
            case 'fill-opacity':
            case 'opacity':
            case 'stop-opacity':
            case 'stroke-opacity':
              styleAttValue.set(p, {
                value: OpacityValue.getOpacityObj(v.value),
                important: v.important,
              });
              break;
          }
        }

        if (styleAttValue.isEmpty()) {
          delete element.attributes.style;
        }
      },
    },
  };
};
