/**
 * @typedef {import('../lib/types.js').XastChild} XastChild
 * @typedef {import('../lib/types.js').XastElement} XastElement
 * @typedef {import('../lib/types.js').XastParent} XastParent
 */

import { elemsGroups } from './_collections.js';
import { querySelector, detachNodeFromParent } from '../lib/xast.js';
import { parsePathData } from '../lib/path.js';
import { findReferences } from '../lib/svgo/tools.js';

const nonRendering = elemsGroups.nonRendering;

export const name = 'removeHiddenElems';
export const description =
  'removes hidden elements (zero sized, with absent attributes)';

/**
 * Remove hidden elements with disabled rendering:
 * - display="none"
 * - opacity="0"
 * - circle with zero radius
 * - ellipse with zero x-axis or y-axis radius
 * - rectangle with zero width or height
 * - pattern with zero width or height
 * - image with zero width or height
 * - path with empty data
 * - polyline with empty points
 * - polygon with empty points
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types.js').Plugin<'removeHiddenElems'>}
 */
export const fn = (root, params, info) => {
  const {
    isHidden = true,
    displayNone = true,
    opacity0 = true,
    circleR0 = true,
    ellipseRX0 = true,
    ellipseRY0 = true,
    rectWidth0 = true,
    rectHeight0 = true,
    patternWidth0 = true,
    patternHeight0 = true,
    imageWidth0 = true,
    imageHeight0 = true,
    pathEmptyD = true,
    polylineEmptyPoints = true,
    polygonEmptyPoints = true,
  } = params;

  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    !styleData.hasOnlyFeatures(['simple-selectors', 'attribute-selectors'])
  ) {
    return;
  }

  let inNonRenderingNode = 0;

  /**
   * Skip non-rendered nodes initially, and only detach if they have no ID, or
   * their ID is not referenced by another node.
   *
   * @type {Set<XastElement>}
   */
  const nonRenderedNodes = new Set();

  /**
   * IDs for removed hidden definitions.
   *
   * @type {Set<string>}
   */
  const removedDefIds = new Set();

  /** @type {Set<XastElement>} */
  const defNodesToRemove = new Set();

  /**
   * @type {Set<XastElement>}
   */
  const allDefs = new Set();

  /** @type {Map<string,Set<XastElement>>} */
  const allReferences = new Map();

  /** @type {Map<XastElement,string[]>} */
  const referencedIdsByNode = new Map();

  /**
   * @type {Map<string, XastElement[]>}
   */
  const referencesById = new Map();

  /**
   * Nodes can't be removed if they or any of their children have an id attribute that is referenced.
   * @param {XastElement} node
   * @returns boolean
   */
  function canRemoveNonRenderingNode(node) {
    const refs = allReferences.get(node.attributes.id);
    if (refs && refs.size) {
      return false;
    }
    for (const child of node.children) {
      if (child.type === 'element' && !canRemoveNonRenderingNode(child)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Retrieve information about all IDs referenced by an element and its children.
   * @param {XastElement} node
   * @returns {XastElement[]}
   */
  function getNodesReferencedByBranch(node) {
    const allIds = [];
    const thisNodeIds = referencedIdsByNode.get(node);
    if (thisNodeIds) {
      allIds.push(node);
    }
    for (const child of node.children) {
      if (child.type === 'element') {
        allIds.push(...getNodesReferencedByBranch(child));
      }
    }
    return allIds;
  }

  /**
   * @param {string} referencedId
   * @param {XastElement} referencingElement
   */
  function recordReference(referencedId, referencingElement) {
    const refs = allReferences.get(referencedId);
    if (refs) {
      refs.add(referencingElement);
    } else {
      allReferences.set(referencedId, new Set([referencingElement]));
    }
  }

  /**
   * @param {XastElement} node
   * @param {XastParent} parentNode
   */
  function removeElement(node, parentNode) {
    if (
      node.type === 'element' &&
      node.attributes.id != null &&
      parentNode.type === 'element' &&
      parentNode.name === 'defs'
    ) {
      removedDefIds.add(node.attributes.id);
    }

    defNodesToRemove.add(node);
  }

  // Record all references in the style element.
  const styleElement = styleData.getFirstStyleElement();
  if (styleElement) {
    for (const id of styleData.getIdsReferencedByProperties()) {
      recordReference(id, styleElement);
    }
  }

  return {
    element: {
      enter: (node, parentNode, parentInfo) => {
        if (nonRendering.has(node.name)) {
          nonRenderedNodes.add(node);
          inNonRenderingNode++;
        }
        const computedStyle = styleData.computeStyle(node, parentInfo);
        const opacity = computedStyle.get('opacity');
        // https://www.w3.org/TR/SVG11/masking.html#ObjectAndGroupOpacityProperties
        if (opacity0 && opacity === '0') {
          if (!inNonRenderingNode) {
            if (node.name === 'path') {
              // It's possible this will be referenced in a <textPath>.
              nonRenderedNodes.add(node);
            } else {
              removeElement(node, parentNode);
              return;
            }
          }
        }

        if (node.name === 'defs') {
          allDefs.add(node);
        }

        if (node.name === 'use') {
          for (const attr of Object.keys(node.attributes)) {
            if (attr !== 'href' && !attr.endsWith(':href')) continue;
            const value = node.attributes[attr];
            const id = value.slice(1);

            let refs = referencesById.get(id);
            if (!refs) {
              refs = [];
              referencesById.set(id, refs);
            }
            refs.push(node);
          }
        }

        // Removes hidden elements
        // https://www.w3schools.com/cssref/pr_class_visibility.asp
        const visibility = computedStyle.get('visibility');
        if (
          isHidden &&
          visibility === 'hidden' &&
          // keep if any descendant enables visibility
          querySelector(node, '[visibility=visible]') == null
        ) {
          removeElement(node, parentNode);
          return;
        }

        // display="none"
        //
        // https://www.w3.org/TR/SVG11/painting.html#DisplayProperty
        // "A value of display: none indicates that the given element
        // and its children shall not be rendered directly"
        const display = computedStyle.get('display');
        if (
          displayNone &&
          display === 'none' &&
          // markers with display: none still rendered
          node.name !== 'marker'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Circles with zero radius
        //
        // https://www.w3.org/TR/SVG11/shapes.html#CircleElementRAttribute
        // "A value of zero disables rendering of the element"
        //
        // <circle r="0">
        if (
          circleR0 &&
          node.name === 'circle' &&
          node.children.length === 0 &&
          node.attributes.r === '0'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Ellipse with zero x-axis radius
        //
        // https://www.w3.org/TR/SVG11/shapes.html#EllipseElementRXAttribute
        // "A value of zero disables rendering of the element"
        //
        // <ellipse rx="0">
        if (
          ellipseRX0 &&
          node.name === 'ellipse' &&
          node.children.length === 0 &&
          node.attributes.rx === '0'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Ellipse with zero y-axis radius
        //
        // https://www.w3.org/TR/SVG11/shapes.html#EllipseElementRYAttribute
        // "A value of zero disables rendering of the element"
        //
        // <ellipse ry="0">
        if (
          ellipseRY0 &&
          node.name === 'ellipse' &&
          node.children.length === 0 &&
          node.attributes.ry === '0'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Rectangle with zero width
        //
        // https://www.w3.org/TR/SVG11/shapes.html#RectElementWidthAttribute
        // "A value of zero disables rendering of the element"
        //
        // <rect width="0">
        if (
          rectWidth0 &&
          node.name === 'rect' &&
          node.children.length === 0 &&
          node.attributes.width === '0'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Rectangle with zero height
        //
        // https://www.w3.org/TR/SVG11/shapes.html#RectElementHeightAttribute
        // "A value of zero disables rendering of the element"
        //
        // <rect height="0">
        if (
          rectHeight0 &&
          rectWidth0 &&
          node.name === 'rect' &&
          node.children.length === 0 &&
          node.attributes.height === '0'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Pattern with zero width
        //
        // https://www.w3.org/TR/SVG11/pservers.html#PatternElementWidthAttribute
        // "A value of zero disables rendering of the element (i.e., no paint is applied)"
        //
        // <pattern width="0">
        if (
          patternWidth0 &&
          node.name === 'pattern' &&
          node.attributes.width === '0'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Pattern with zero height
        //
        // https://www.w3.org/TR/SVG11/pservers.html#PatternElementHeightAttribute
        // "A value of zero disables rendering of the element (i.e., no paint is applied)"
        //
        // <pattern height="0">
        if (
          patternHeight0 &&
          node.name === 'pattern' &&
          node.attributes.height === '0'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Image with zero width
        //
        // https://www.w3.org/TR/SVG11/struct.html#ImageElementWidthAttribute
        // "A value of zero disables rendering of the element"
        //
        // <image width="0">
        if (
          imageWidth0 &&
          node.name === 'image' &&
          node.attributes.width === '0'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Image with zero height
        //
        // https://www.w3.org/TR/SVG11/struct.html#ImageElementHeightAttribute
        // "A value of zero disables rendering of the element"
        //
        // <image height="0">
        if (
          imageHeight0 &&
          node.name === 'image' &&
          node.attributes.height === '0'
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Path with empty data
        //
        // https://www.w3.org/TR/SVG11/paths.html#DAttribute
        //
        // <path d=""/>
        if (pathEmptyD && node.name === 'path') {
          if (node.attributes.d == null) {
            removeElement(node, parentNode);
            return;
          }
          const pathData = parsePathData(node.attributes.d);
          if (pathData.length === 0) {
            removeElement(node, parentNode);
            return;
          }
          // keep single point paths for markers
          if (
            pathData.length === 1 &&
            !computedStyle.has('marker-start') &&
            !computedStyle.has('marker-end')
          ) {
            removeElement(node, parentNode);
            return;
          }
        }

        // Polyline with empty points
        //
        // https://www.w3.org/TR/SVG11/shapes.html#PolylineElementPointsAttribute
        //
        // <polyline points="">
        if (
          polylineEmptyPoints &&
          node.name === 'polyline' &&
          node.attributes.points == null
        ) {
          removeElement(node, parentNode);
          return;
        }

        // Polygon with empty points
        //
        // https://www.w3.org/TR/SVG11/shapes.html#PolygonElementPointsAttribute
        //
        // <polygon points="">
        if (
          polygonEmptyPoints &&
          node.name === 'polygon' &&
          node.attributes.points == null
        ) {
          removeElement(node, parentNode);
          return;
        }

        const allIds = [];
        for (const [name, value] of Object.entries(node.attributes)) {
          const ids = findReferences(name, value);

          // Record which other nodes are referenced by this node.
          for (const id of ids) {
            allIds.push(id);
            recordReference(id, node);
          }
        }

        // Record which ids are referenced by this node.
        if (allIds.length) {
          referencedIdsByNode.set(node, allIds);
        }
      },
      exit: (node) => {
        if (nonRendering.has(node.name)) {
          inNonRenderingNode--;
        }
      },
    },
    root: {
      exit: () => {
        for (const child of defNodesToRemove) {
          detachNodeFromParent(child);
          nonRenderedNodes.delete(child);
        }

        for (const id of removedDefIds) {
          const refs = referencesById.get(id);
          if (refs) {
            for (const node of refs) {
              detachNodeFromParent(node);
            }
          }
        }

        let tryAgain;
        do {
          tryAgain = false;
          for (const nonRenderedNode of nonRenderedNodes) {
            if (canRemoveNonRenderingNode(nonRenderedNode)) {
              detachNodeFromParent(nonRenderedNode);
              nonRenderedNodes.delete(nonRenderedNode);

              // For any elements referenced by the just-deleted node and its children, remove the node from the list of referencing nodes.
              const deletedReferenceNodes =
                getNodesReferencedByBranch(nonRenderedNode);
              for (const deletedNode of deletedReferenceNodes) {
                const referencedIds = referencedIdsByNode.get(deletedNode);
                if (referencedIds) {
                  for (const id of referencedIds) {
                    const referencingNodes = allReferences.get(id);
                    if (referencingNodes) {
                      referencingNodes.delete(deletedNode);
                      if (referencingNodes.size === 0) {
                        tryAgain = true;
                      }
                    }
                  }
                }
              }
            }
          }
        } while (tryAgain);

        for (const node of allDefs) {
          if (node.children.length === 0) {
            detachNodeFromParent(node);
          }
        }
      },
    },
  };
};
