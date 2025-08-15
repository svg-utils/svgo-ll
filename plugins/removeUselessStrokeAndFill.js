import { visitSkip, detachNodeFromParent } from '../lib/xast.js';
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
export const fn = (root, params, info) => {
  const {
    stroke: removeStroke = true,
    fill: removeFill = true,
    removeNone = false,
  } = params;

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
        const parentNode = element.parentNode;
        const computedParentStyle =
          parentNode.type === 'element'
            ? styleData.computeStyle(parentNode, parentList.slice(0, -1))
            : null;
        const parentStroke =
          computedParentStyle === null
            ? null
            : computedParentStyle.get('stroke');

        // remove stroke*
        if (removeStroke) {
          if (
            stroke === undefined ||
            stroke === 'none' ||
            (strokeOpacity !== undefined && strokeOpacity === '0') ||
            (strokeWidth !== undefined && strokeWidth === '0')
          ) {
            // stroke-width may affect the size of marker-end
            // marker is not visible when stroke-width is 0
            if (
              (strokeWidth !== undefined && strokeWidth === '0') ||
              markerEnd === undefined
            ) {
              for (const name of Object.keys(element.attributes)) {
                if (name.startsWith('stroke')) {
                  delete element.attributes[name];
                }
              }
              // set explicit none to not inherit from parent
              if (parentStroke !== undefined && parentStroke !== 'none') {
                element.attributes.stroke = 'none';
              }
            }
          }
        }

        // remove fill*
        if (removeFill) {
          if (
            (fill !== undefined && fill === 'none') ||
            (fillOpacity !== undefined && fillOpacity === '0')
          ) {
            for (const name of Object.keys(element.attributes)) {
              if (name.startsWith('fill-')) {
                delete element.attributes[name];
              }
            }
            if (fill === undefined || fill !== 'none') {
              element.attributes.fill = 'none';
            }
          }
        }

        if (removeNone) {
          if (
            (stroke === undefined ||
              element.attributes.stroke.toString() === 'none') &&
            ((fill !== undefined && fill === 'none') ||
              element.attributes.fill.toString() === 'none')
          ) {
            detachNodeFromParent(element);
          }
        }
      },
    },
  };
};
