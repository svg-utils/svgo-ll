/**
 * @param {import('../lib/svgo.js').CustomPlugin[]} pluginList
 * @returns {import('../lib/svgo.js').ResolvedPlugins}
 */
export function getResolvedPlugins(pluginList) {
  return { pre: [], plugins: pluginList };
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
