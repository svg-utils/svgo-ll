import { getStyleDeclarations, writeStyleAttribute } from '../lib/css.js';
import { visitSkip } from '../lib/xast.js';
import { elemsGroups, uselessShapeProperties } from './_collections.js';

export const name = 'cleanupStyleAttributes';
export const description = 'removes invalid properties from style attributes';

const CLASS_SPLITTER = /\s/;

/**
 * See https://www.w3.org/TR/SVG2/styling.html#PresentationAttributes.
 * The list below also includes the shorthand property "font".
 */
const presentationProperties = new Set([
  'alignment-baseline',
  'baseline-shift',
  'clip-path',
  'clip-rule',
  'color',
  'color-interpolation',
  'color-interpolation-filters',
  'color-rendering',
  'cursor',
  'direction',
  'display',
  'dominant-baseline',
  'fill',
  'fill-opacity',
  'fill-rule',
  'filter',
  'flood-color',
  'flood-opacity',
  'font',
  'font-family',
  'font-size',
  'font-size-adjust',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-weight',
  'glyph-orientation-horizontal',
  'glyph-orientation-vertical',
  'image-rendering',
  'letter-spacing',
  'lighting-color',
  'marker-end',
  'marker-mid',
  'marker-start',
  'mask',
  'opacity',
  'overflow',
  'paint-order',
  'pointer-events',
  'shape-rendering',
  'stop-color',
  'stop-opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'text-anchor',
  'text-decoration',
  'text-overflow',
  'text-rendering',
  'transform',
  'unicode-bidi',
  'vector-effect',
  'visibility',
  'white-space',
  'word-spacing',
  'writing-mode',
]);

/** @type {Object<string,Set<string>>} */
const limitedProperties = {
  cx: new Set(['circle', 'ellipse']),
  cy: new Set(['circle', 'ellipse']),
  d: new Set(['path']),
  height: new Set(['foreignObject', 'image', 'rect', 'svg', 'symbol', 'use']),
  r: new Set(['circle']),
  rx: new Set(['ellipse', 'rect']),
  ry: new Set(['ellipse', 'rect']),
  width: new Set(['foreignObject', 'image', 'rect', 'svg', 'symbol', 'use']),
  x: new Set(['foreignObject', 'image', 'rect', 'svg', 'symbol', 'use']),
  y: new Set(['foreignObject', 'image', 'rect', 'svg', 'symbol', 'use']),
};

/**
 * @type {import('./plugins-types.js').Plugin<'cleanupStyleAttributes'>}
 */
export const fn = (root, params, info) => {
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

    const classes = classStr.split(CLASS_SPLITTER);
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
    const allowedElements = limitedProperties[propName];
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
      enter: (node) => {
        if (node.name === 'foreignObject') {
          return visitSkip;
        }

        cleanupClassAttributes(node, styleData);

        if (hasStyleAttributeSelector) {
          return;
        }

        const origProperties = getStyleDeclarations(node);
        if (!origProperties) {
          return;
        }

        const newProperties = new Map();

        if (elemsGroups.animation.has(node.name)) {
          // Style attributes have no effect on animation elements.
          writeStyleAttribute(node, newProperties);
          return;
        }

        const isShapeGroup = node.name === 'g' && hasOnlyShapeChildren(node);
        for (const [p, v] of origProperties.entries()) {
          if (!elementCanHaveProperty(node.name, p)) {
            continue;
          }
          if (isShapeGroup && uselessShapeProperties.has(p)) {
            continue;
          }
          newProperties.set(p, v);
        }
        writeStyleAttribute(node, newProperties);
      },
    },
  };
};
