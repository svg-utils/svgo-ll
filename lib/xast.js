export const visitSkip = Symbol();

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
 * @param {import('./types.js').XastParent} parent
 * @param {string} name
 * @param {Object<string,import('./types.js').SVGAttValue>} attributes
 * @param {import('./types.js').XastChild[]} children
 * @returns {import('./types.js').XastElement}
 */
export function createElement(parent, name, attributes = {}, children = []) {
  /** @type {import('./types.js').XastElement} */
  const element = {
    type: 'element',
    parentNode: parent,
    name: name,
    local: name,
    prefix: '',
    uri: undefined,
    attributes: attributes,
    children: children,
  };
  parent.children.push(element);
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
