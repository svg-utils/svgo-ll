import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { updateStyleAttribute } from '../lib/svgo/tools-svg.js';
import { visitSkip } from '../lib/xast.js';
import { elemsGroups } from './_collections.js';

export const name = 'removeUselessStrokeAndFill';
export const description = 'removes useless stroke and fill attributes';

/**
 * Remove useless stroke and fill attrs.
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types.js').Plugin<'removeUselessStrokeAndFill'>}
 */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    info.docData.hasAnimations() ||
    styleData === null
  ) {
    return;
  }

  return {
    element: {
      enter: (element, parentList) => {
        // id attribute deoptimise the whole subtree
        if (element.attributes.id) {
          return visitSkip;
        }
        if (!elemsGroups.shape.has(element.name)) {
          return;
        }
        const computedStyle = styleData.computeStyle(element, parentList);
        const stroke = computedStyle.get('stroke');
        const strokeOpacity = computedStyle.get('stroke-opacity');
        const strokeWidth = computedStyle.get('stroke-width');
        const markerEnd = computedStyle.get('marker-end');
        const fill = computedStyle.get('fill');
        const fillOpacity = computedStyle.get('fill-opacity');

        // Remove stroke*
        if (
          stroke === undefined ||
          stroke === 'none' ||
          strokeOpacity === '0' ||
          strokeWidth === '0'
        ) {
          // stroke-width may affect the size of marker-end
          // marker is not visible when stroke-width is 0
          if (strokeWidth === '0' || markerEnd === undefined) {
            removePrefixedProperties(element, 'stroke');

            // If necessary, set explicit none to override parent or <style>.
            setNone(element, 'stroke', styleData, parentList, true);
          }
        }

        // Remove fill*
        if (
          (fill !== undefined && fill === 'none') ||
          (fillOpacity !== undefined && fillOpacity === '0')
        ) {
          removePrefixedProperties(element, 'fill-');

          // If necessary, set explicit none to override parent or <style>.
          setNone(element, 'fill', styleData, parentList, false);
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} prefix
 */
function removePrefixedProperties(element, prefix) {
  // Remove attributes
  for (const name of Object.keys(element.attributes)) {
    if (name.startsWith(prefix)) {
      delete element.attributes[name];
    }
  }

  // Remove style attribute properties.
  const style = StyleAttValue.getStyleAttValue(element);
  if (style) {
    for (const propName of style.keys()) {
      if (propName.startsWith(prefix)) {
        style.delete(propName);
      }
    }
    updateStyleAttribute(element, style);
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} propName
 * @param {import('../lib/types.js').StyleData} styleData
 * @param {Readonly<{element:import('../lib/types.js').XastParent}[]>} parentList
 * @param {boolean} allowUndefined
 */
function setNone(element, propName, styleData, parentList, allowUndefined) {
  // If necessary, set explicit none to override parent or <style>.
  const computedStyle = styleData.computeStyle(element, parentList);
  const value = computedStyle.get(propName);
  if (value !== 'none' && (!allowUndefined || value !== undefined)) {
    const style =
      StyleAttValue.getStyleAttValue(element) ?? new StyleAttValue();
    style.set(propName, { value: 'none', important: false });
    updateStyleAttribute(element, style);
    delete element.attributes[propName];
  }
}
