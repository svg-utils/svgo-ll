import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { parseAttr } from '../lib/attrs/parseAttr.js';
import { createElement, createRoot } from '../lib/xast.js';

/**
 * @param {string} name
 * @param {Object<string,string>} atts
 */
export function createTestElement(name, atts) {
  const root = createRoot();
  const attMap = new SvgAttMap();
  for (const [k, v] of Object.entries(atts)) {
    attMap.set(k, parseAttr('elem', k, v));
  }
  return createElement(root, name, '', undefined, attMap);
}

/**
 * @param {import('../lib/types.js').XastRoot} root
 * @returns {import('../lib/types.js').XastElement}
 */
export function getFirstChild(root) {
  for (const svg of root.children) {
    if (svg.type === 'element' && svg.local === 'svg') {
      for (const child of svg.children) {
        if (child.type === 'element') {
          return child;
        }
      }
    }
  }
  throw new Error();
}

/**
 * @param {import('../lib/svgo.js').CustomPlugin[]} pluginList
 * @returns {import('../lib/svgo.js').ResolvedPlugins}
 */
export function getResolvedPlugins(pluginList) {
  return { pre: [], plugins: pluginList, post: [] };
}

/**
 * @param {import('../lib/types.js').XastNode} element
 * @param {import('../lib/types.js').XastParent} [parent]
 */
export function validateParentNodes(element, parent) {
  if (element.type === 'root') {
    if (parent !== undefined) {
      throw new Error();
    }
  } else if (parent !== element.parentNode) {
    throw new Error();
  }
  if (element.type === 'root' || element.type === 'element') {
    for (const child of element.children) {
      validateParentNodes(child, element);
    }
  }
  return true;
}
