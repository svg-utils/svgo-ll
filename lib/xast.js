import { selectAll, selectOne, is } from 'css-select';
import xastAdaptor from './svgo/css-select-adapter.js';

/**
 * @typedef {import('./types.js').XastRoot} XastRoot
 * @typedef {import('./types.js').XastNode} XastNode
 * @typedef {import('./types.js').XastChild} XastChild
 * @typedef {import('./types.js').XastParent} XastParent
 * @typedef {import('./types.js').XastElement} XastElement
 * @typedef {import('./types.js').ParentList} ParentList
 * @typedef {import('./types.js').Visitor} Visitor
 */

const cssSelectOptions = {
  xmlMode: true,
  adapter: xastAdaptor,
};

/**
 * @type {(node: XastNode, selector: string) => XastChild[]}
 * @deprecated
 */
export const querySelectorAll = (node, selector) => {
  return selectAll(selector, node, cssSelectOptions);
};

/**
 * @type {(node: XastNode, selector: string) => ?XastChild}
 * @deprecated
 */
export const querySelector = (node, selector) => {
  return selectOne(selector, node, cssSelectOptions);
};

/**
 * @type {(node: XastChild, selector: string) => boolean}
 * @deprecated
 */
export const matches = (node, selector) => {
  return is(node, selector, cssSelectOptions);
};

export const visitSkip = Symbol();

/**
 * @type {(node: XastRoot, visitor: Visitor) => void}
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
 * @type {(node: XastChild, visitor: Visitor, parents: ParentList) => void}
 */
const visitChild = (node, visitor, parents) => {
  const callbacks = visitor[node.type];
  const parentNode = parents[parents.length - 1].element;
  if (callbacks && callbacks.enter) {
    // @ts-ignore
    const symbol = callbacks.enter(node, parentNode, parents);
    if (symbol === visitSkip) {
      return;
    }
  }

  // visit element children if still attached to parent
  if (node.type === 'element') {
    parents.push({ element: node });
    if (parentNode && parentNode.children.includes(node)) {
      for (const child of node.children) {
        visitChild(child, visitor, parents);
      }
    }
    parents.pop();
  }

  if (callbacks && callbacks.exit) {
    // @ts-ignore
    callbacks.exit(node, parentNode, parents);
  }
};

/**
 * @param {XastChild} node
 * @param {XastParent} [parentNode]
 */
// eslint-disable-next-line no-unused-vars
export const detachNodeFromParent = (node, parentNode) => {
  // avoid splice to not break for loops
  node.parentNode.children = node.parentNode.children.filter(
    (child) => child !== node,
  );
};
