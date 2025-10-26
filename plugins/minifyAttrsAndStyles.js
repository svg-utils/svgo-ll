import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { transformAttrs } from './_collections.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'minifyAttrsAndStyles';
export const description =
  'use the shorter of attributes and styles in each element';

/**
 * @typedef {{width:number,attsToChange:Map<string,import('../lib/types.js').AttValue>}} AttData
 */

/** @type {import('./plugins-types.js').Plugin<'minifyAttrsAndStyles'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  const hasStyles = styleData.hasStyles();

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        if (hasStyles) {
          // Just shorten the transforms in place, don't rearrange attributes and properties.
          shortenTransforms(element);
          return;
        }

        const props = getPresentationProperties(element);
        if (props.count() === 0) {
          return;
        }

        /** @type {import('../types/types.js').TransformAttValue|undefined} */
        const t = props.get('transform');
        if (t) {
          // If there's a transform property, make sure it can be converted to an attribute.
          if (!t.canBeAttribute()) {
            return;
          }
        }

        const attData = getAttrWidth(props);
        const propData = getStyleWidth(props);
        if (attData.width < propData.width) {
          // Attributes are shorter; remove the style attribute and use individual attributes.

          for (const [name, value] of props.entries()) {
            element.svgAtts.set(name, value);
          }
          // Overwrite any attributes that were changed by getAttrWidth()
          for (const [name, value] of attData.attsToChange.entries()) {
            element.svgAtts.set(name, value);
          }

          element.svgAtts.delete('style');
        } else {
          // Style is at least as short; remove the individual attributes and convert to style properties.
          for (const name of props.keys()) {
            element.svgAtts.delete(name);
          }
          // Overwrite any properties that were changed by getStyleWidth()
          for (const [name, value] of propData.attsToChange.entries()) {
            props.set(name, value);
          }
          new StyleAttValue(props).updateElement(element);
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').SvgAttValues} props
 * @returns {AttData}
 */
function getAttrWidth(props) {
  /** @type {AttData} */
  const data = { width: 0, attsToChange: new Map() };
  for (let [name, value] of props.entries()) {
    switch (name) {
      case 'gradientTransform':
      case 'patternTransform':
      case 'transform':
        value = /** @type {import('../types/types.js').TransformAttValue} */ (
          value
        ).findShortestAttribute();
        data.attsToChange.set(name, value);
        break;
    }
    data.width += ' =""'.length + name.length + value.toString().length;
  }
  return data;
}

/**
 * @param {import('../lib/types.js').SvgAttValues} props
 * @returns {AttData}
 */
function getStyleWidth(props) {
  /** @type {AttData} */
  const data = { width: 0, attsToChange: new Map() };

  const newProps = new SvgAttMap();
  for (let [name, value] of props.entries()) {
    switch (name) {
      case 'gradientTransform':
      case 'patternTransform':
      case 'transform':
        value = /** @type {import('../types/types.js').TransformAttValue} */ (
          value
        ).findShortestProperty();
        data.attsToChange.set(name, value);
        break;
    }
    newProps.set(name, value);
  }

  const att = new StyleAttValue(newProps);
  data.width = ' style=""'.length + att.toString().length;
  return data;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 */
function shortenTransforms(element) {
  for (const [attName, attValue] of element.svgAtts.entries()) {
    if (transformAttrs.has(attName)) {
      element.svgAtts.set(
        attName,
        /** @type {import('../types/types.js').TransformAttValue} */ (
          attValue
        ).findShortestAttribute(),
      );
    } else if (attName === 'style') {
      for (const [propName, propValue] of /** @type {StyleAttValue} */ (
        attValue
      ).entries()) {
        if (propName === 'transform') {
          /** @type {StyleAttValue} */ (attValue).set(
            propName,
            /** @type {import('../types/types.js').TransformAttValue} */ (
              propValue
            ).findShortestProperty(),
          );
        }
      }
    }
  }
}
