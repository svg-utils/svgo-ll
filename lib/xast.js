import { SvgAttMap } from './ast/svgAttMap.js';

export const visitSkip = Symbol();

/**
 * @param {import('./types.js').XastParent} parent
 * @param {string} local
 * @param {string} prefix
 * @param {string|undefined}  uri
 * @param {Object<string,import('./types.js').SVGAttValue>} attributes
 * @param {import('./types.js').XastChild[]} children
 * @param {boolean} [isSelfClosing=false]
 * @param {boolean} [addToParent=true] ]
 * @returns {import('./types.js').XastElement}
 */
export function createElement(
  parent,
  local,
  prefix = '',
  uri = undefined,
  attributes = {},
  children = [],
  isSelfClosing = false,
  addToParent = true,
) {
  /** @type {import('./types.js').XastElement} */
  const element = {
    type: 'element',
    parentNode: parent,
    local: local,
    prefix: prefix,
    uri: uri,
    svgAtts: new SvgAttMap(),
    otherAtts: undefined,
    children: children,
    isSelfClosing: isSelfClosing,
  };

  for (const [attName, value] of Object.entries(attributes)) {
    element.svgAtts.set(attName, value);
  }

  if (addToParent) {
    parent.children.push(element);
  }
  return element;
}

/**
 * @returns {import('./types.js').XastRoot}
 */
export function createRoot() {
  return { type: 'root', children: [] };
}

/**
 * @param {import('./types.js').XastParent} parent
 * @param {string} value
 * @returns {import('./types.js').XastText}
 */
export function createTextNode(parent, value) {
  /** @type {import('./types.js').XastText} */
  const text = { type: 'text', parentNode: parent, value: value };
  parent.children.push(text);
  return text;
}

/**
 * @param {import('./types.js').XastRoot} root
 * @param {import('./types.js').Visitor} visitor
 */
export function visit(root, visitor) {
  const callbacks = visitor.root;
  if (callbacks && callbacks.enter) {
    const symbol = callbacks.enter(root);
    if (symbol === visitSkip) {
      return;
    }
  }

  for (const child of root.children) {
    visitChild(child, visitor, [{ element: root }]);
  }

  if (callbacks && callbacks.exit) {
    callbacks.exit(root);
  }
}

/**
 * @param {import('./types.js').XastChild} childNode
 * @param {import('./types.js').Visitor} visitor
 * @param {import('./types.js').ParentList} parents
 */
function visitChild(childNode, visitor, parents) {
  const callbacks = visitor[childNode.type];
  if (callbacks && callbacks.enter) {
    // @ts-ignore
    const symbol = callbacks.enter(childNode, parents);
    // If node was detached, node.parentNode is no longer defined.
    if (symbol === visitSkip || !childNode.parentNode) {
      return;
    }
  }

  // visit element children if still attached to parent
  if (childNode.type === 'element') {
    parents.push({ element: childNode });
    for (const child of childNode.children) {
      visitChild(child, visitor, parents);
    }
    parents.pop();
  }

  if (callbacks && callbacks.exit) {
    // @ts-ignore
    callbacks.exit(childNode, parents);
  }
}

/**
 * @param {import('./types.js').XastChild} node
 * @deprecated
 */
export const detachNodeFromParent = (node) => {
  // avoid splice to not break for loops
  node.parentNode.children = node.parentNode.children.filter(
    (child) => child !== node,
  );
  // @ts-ignore - plugins should always have parentNode defined; undefine parentNode here so visit() can avoid visiting its children.
  delete node.parentNode;
};
