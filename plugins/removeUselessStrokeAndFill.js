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
      enter: (node, parentList) => {
        // id attribute deoptimise the whole subtree
        if (node.attributes.id) {
          return visitSkip;
        }
        if (!elemsGroups.shape.has(node.name)) {
          return;
        }
        const computedStyle = styleData.computeStyle(node, parentList);
        const stroke = computedStyle.get('stroke');
        const strokeOpacity = computedStyle.get('stroke-opacity');
        const strokeWidth = computedStyle.get('stroke-width');
        const markerEnd = computedStyle.get('marker-end');
        const fill = computedStyle.get('fill');
        const fillOpacity = computedStyle.get('fill-opacity');
        const parentNode = parentList[parentList.length - 1].element;
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
              for (const name of Object.keys(node.attributes)) {
                if (name.startsWith('stroke')) {
                  delete node.attributes[name];
                }
              }
              // set explicit none to not inherit from parent
              if (parentStroke !== undefined && parentStroke !== 'none') {
                node.attributes.stroke = 'none';
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
            for (const name of Object.keys(node.attributes)) {
              if (name.startsWith('fill-')) {
                delete node.attributes[name];
              }
            }
            if (fill === undefined || fill !== 'none') {
              node.attributes.fill = 'none';
            }
          }
        }

        if (removeNone) {
          if (
            (stroke === undefined ||
              node.attributes.stroke.toString() === 'none') &&
            ((fill !== undefined && fill === 'none') ||
              node.attributes.fill.toString() === 'none')
          ) {
            detachNodeFromParent(node);
          }
        }
      },
    },
  };
};
