export const visitSkip = Symbol();

/**
 * @type {(node: import('./types.js').XastRoot, visitor: import('./types.js').Visitor) => void}
 */
export const visit = (node, visitor) => {
  const callbacks = visitor.root;
  if (callbacks && callbacks.enter) {
    const symbol = callbacks.enter(node);
    if (symbol === visitSkip) {
      return;
    }
  }

  // visit element children if still attached to parent
  if (node.type === 'root') {
    for (const child of node.children) {
      visitChild(child, visitor, [{ element: node }]);
    }
  }

  if (callbacks && callbacks.exit) {
    callbacks.exit(node);
  }
};

/**
 * @type {(node: import('./types.js').XastChild, visitor: import('./types.js').Visitor, parents: import('./types.js').ParentList) => void}
 */
const visitChild = (node, visitor, parents) => {
  const callbacks = visitor[node.type];
  const parentNode = parents[parents.length - 1].element;
  if (callbacks && callbacks.enter) {
    // @ts-ignore
    const symbol = callbacks.enter(node, parentNode, parents);
    // If node was detached, node.parentNode is no longer defined.
    if (symbol === visitSkip || !node.parentNode) {
      return;
    }
  }

  // visit element children if still attached to parent
  if (node.type === 'element') {
    parents.push({ element: node });
    // If node.parentNode was deleted by detachNodeFromParent, don't visit its children.
    for (const child of node.children) {
      visitChild(child, visitor, parents);
    }
    parents.pop();
  }

  if (callbacks && callbacks.exit) {
    // @ts-ignore
    callbacks.exit(node, parentNode, parents);
  }
};

/**
 * @param {import('./types.js').XastChild} node
 * @param {import('./types.js').XastParent} [parentNode]
 * @deprecated
 */
// Disable no-unused-vars until all calls to detachNodeFromParent() are updated.
// eslint-disable-next-line no-unused-vars
export const detachNodeFromParent = (node, parentNode) => {
  // avoid splice to not break for loops
  node.parentNode.children = node.parentNode.children.filter(
    (child) => child !== node,
  );
  // @ts-ignore - plugins should always have parentNode defined; undefine parentNode here so visit() can avoid visiting its children.
  delete node.parentNode;
};
