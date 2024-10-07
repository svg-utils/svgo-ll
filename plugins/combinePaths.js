import { includesUrlReference } from '../lib/svgo/tools.js';
import { uselessShapeProperties } from './_collections.js';
import { intersects, js2path, path2js } from './_path.js';

export const name = 'combinePaths';
export const description = 'combines multiple consecutive paths';

/**
 * @typedef {{pathEl:import('../lib/types.js').XastElement,
 *  pathData?:import('../lib/types.js').PathDataItem[],
 *  properties?:Map<string,string|null>,
 *  attsNotInProps?:Object<string,string>,
 *  merged?:true
 * }} PathElementInfo
 */

/**
 * @param {import('../lib/types.js').XastChild} node
 */
function makePathElInfo(node) {
  return node.type === 'element' && node.name === 'path'
    ? { pathEl: node }
    : undefined;
}

/**
 * @type {import('./plugins-types.js').Plugin<'combinePaths'>}
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  const enabled =
    !info.docData.hasScripts() &&
    styleData !== null &&
    styleData.hasOnlyFeatures([
      'atrules',
      'attribute-selectors',
      'simple-selectors',
    ]) &&
    !styleData.hasAttributeSelector('d');
  if (!enabled) {
    return;
  }

  return {
    element: {
      enter: (node, parentNode, parentInfo) => {
        if (node.children.length === 0) {
          return;
        }

        let currentPath;

        // Make a copy of parentInfo since we're adding to it.
        const currentElParentInfo = parentInfo.slice();
        currentElParentInfo.push({ element: node });

        const mergedNodes = new Set();

        // There should be no need to explicitly check for animations. Animated paths will never be mergeable,
        // they will be eliminated because either (a) they have children,
        // or (b) they have an id attribute, which will make their attribute sets differ.

        for (const child of node.children) {
          if (currentPath === undefined) {
            currentPath = canBeFirstPath(
              makePathElInfo(child),
              styleData,
              currentElParentInfo,
            );
            continue;
          }
          const childPathInfo = makePathElInfo(child);
          const mergeablePathInfo = isMergeable(
            currentPath,
            childPathInfo,
            styleData,
            currentElParentInfo,
          );
          if (mergeablePathInfo !== undefined) {
            mergePaths(currentPath, mergeablePathInfo);
            mergedNodes.add(child);
          } else {
            writePathData(currentPath);
            currentPath = canBeFirstPath(
              childPathInfo,
              styleData,
              currentElParentInfo,
            );
          }
        }

        if (currentPath) {
          writePathData(currentPath);
        }

        if (mergedNodes.size) {
          node.children = node.children.filter(
            (child) => !mergedNodes.has(child),
          );
        }
      },
    },
  };
};

/**
 * @param {Map<string,string|null>} styles
 */
function allStylesAreMergeable(styles) {
  /**
   *
   * @param {string|null} value
   */
  function isPaintMergeable(value) {
    return value !== null && !includesUrlReference(value);
  }

  for (const [name, value] of styles.entries()) {
    switch (name) {
      case 'marker-end':
      case 'marker-mid':
      case 'marker-start':
        if (value === 'none') {
          continue;
        }
        break;
      case 'fill':
      case 'stroke':
        if (isPaintMergeable(value)) {
          continue;
        }
        break;
      case 'd':
      case 'fill-opacity':
      case 'opacity':
      case 'stroke-linecap':
      case 'stroke-linejoin':
      case 'stroke-opacity':
      case 'stroke-width':
      case 'transform':
        continue;
      default:
        if (uselessShapeProperties.has(name)) {
          continue;
        }
        break;
    }

    return false;
  }
  return true;
}

/**
 * @param {PathElementInfo|undefined} pathElInfo
 * @param {import('../lib/types.js').StyleData} styleData
 * @param {import('../lib/types.js').ParentList} parentInfo
 * @returns {PathElementInfo|undefined}
 */
function canBeFirstPath(pathElInfo, styleData, parentInfo) {
  if (pathElInfo === undefined) {
    return undefined;
  }

  const pathEl = pathElInfo.pathEl;
  if (pathEl.children.length > 0) {
    return;
  }
  if (pathEl.attributes['pathLength']) {
    return;
  }

  const styles = getComputedStyle(pathElInfo, styleData, parentInfo);
  if (!allStylesAreMergeable(styles)) {
    return;
  }

  return pathElInfo;
}

/**
 * @param {PathElementInfo} pathElInfo
 * @param {import('../lib/types.js').StyleData} styleData
 * @param {Readonly<import('../lib/types.js').ParentList>} parentInfo
 */
function getComputedStyle(pathElInfo, styleData, parentInfo) {
  if (!pathElInfo.properties) {
    pathElInfo.properties = styleData.computeStyle(
      pathElInfo.pathEl,
      parentInfo,
    );
  }
  return pathElInfo.properties;
}

/**
 * @param {PathElementInfo} pathElInfo
 */
function getPathData(pathElInfo) {
  if (!pathElInfo.pathData) {
    pathElInfo.pathData = path2js(pathElInfo.pathEl);
  }
  return pathElInfo.pathData;
}

/**
 * @param {PathElementInfo} currentPathInfo
 * @param {PathElementInfo|undefined} sibling
 * @param {import('../lib/types.js').StyleData} styleData
 * @param {Readonly<import('../lib/types.js').ParentList>} parentInfo
 * @returns {PathElementInfo|undefined}
 */
function isMergeable(currentPathInfo, sibling, styleData, parentInfo) {
  /**
   * @param {PathElementInfo} pathInfo
   */
  function getAttsNotInProperties(pathInfo) {
    if (!pathInfo.attsNotInProps) {
      /** @type {Object<string,string>} */
      const atts = {};
      for (const [k, v] of Object.entries(pathInfo.pathEl.attributes)) {
        if (k === 'style') {
          continue;
        }
        if (!currentStyle.has(k)) {
          atts[k] = v;
        }
      }
      pathInfo.attsNotInProps = atts;
    }
    return pathInfo.attsNotInProps;
  }

  if (sibling === undefined) {
    return;
  }

  if (sibling.pathEl.children.length > 0) {
    return;
  }

  // Make sure all properties match.
  const currentStyle = getComputedStyle(currentPathInfo, styleData, parentInfo);
  const siblingStyle = getComputedStyle(sibling, styleData, parentInfo);
  if (currentStyle.size !== siblingStyle.size) {
    return;
  }
  for (const [key, value] of currentStyle.entries()) {
    if (key === 'd') {
      continue;
    }
    if (value === null || siblingStyle.get(key) !== value) {
      return;
    }
  }

  // Make sure all attributes not in properties match.
  const currentAtts = getAttsNotInProperties(currentPathInfo);
  const currentEntries = Object.entries(currentAtts);
  const siblingAtts = getAttsNotInProperties(sibling);
  if (currentEntries.length !== Object.entries(siblingAtts).length) {
    return;
  }
  for (const [k, v] of currentEntries) {
    if (siblingAtts[k] !== v) {
      return;
    }
  }

  // Make sure paths don't intersect.
  if (intersects(getPathData(currentPathInfo), getPathData(sibling))) {
    return;
  }

  return sibling;
}

/**
 * @param {PathElementInfo} currentPathInfo
 * @param {PathElementInfo} sibling
 */
function mergePaths(currentPathInfo, sibling) {
  getPathData(currentPathInfo).push(...getPathData(sibling));
  currentPathInfo.merged = true;
}

/**
 * @param {PathElementInfo} currentPathInfo
 */
function writePathData(currentPathInfo) {
  if (!currentPathInfo.merged || currentPathInfo.pathData === undefined) {
    return;
  }
  js2path(currentPathInfo.pathEl, currentPathInfo.pathData, {});
}
