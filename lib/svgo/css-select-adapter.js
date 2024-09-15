/**
 * @typedef {import('../types.js').XastNode} XastNode
 * @typedef {import('../types.js').XastElement} XastElement
 */

/**
 * @param {XastNode} node
 */
const isTag = (node) => {
  return node.type === 'element';
};

/**
 * @param {function(XastNode):boolean} test
 * @param {XastNode[]} elems
 * @returns {boolean}
 */
const existsOne = (test, elems) => {
  return elems.some((elem) => {
    if (isTag(elem)) {
      return test(elem) || existsOne(test, getChildren(elem));
    } else {
      return false;
    }
  });
};

/**
 * @param {XastElement} elem
 * @param {string} name
 */
const getAttributeValue = (elem, name) => {
  return elem.attributes[name];
};

/**
 * @param {XastNode} node
 */
const getChildren = (node) => {
  switch (node.type) {
    case 'element':
    case 'root':
      return node.children;
  }
  return [];
};

/**
 * @param {XastElement} elemAst
 */
const getName = (elemAst) => {
  return elemAst.name;
};

/**
 * @param {XastElement} node
 */
const getParent = (node) => {
  return node.parentNode.type === 'element' ? node.parentNode : null;
};

/**
 * @param {import('../types.js').XastNode} elem
 */
const getSiblings = (elem) => {
  if (elem.type === 'root') {
    return [];
  }
  var parent = elem.parentNode;
  return parent ? getChildren(parent) : [];
};

/**
 * @param {XastElement} node
 */
const getText = (node) => {
  if (node.children[0].type === 'text' || node.children[0].type === 'cdata') {
    return node.children[0].value;
  }
  return '';
};

/**
 * @param {XastElement} elem
 * @param {string} name
 */
const hasAttrib = (elem, name) => {
  return elem.attributes[name] !== undefined;
};

/**
 * @param {(XastNode)[]} nodes
 */
const removeSubsets = (nodes) => {
  let idx = nodes.length;

  /*
   * Check if each node (or one of its ancestors) is already contained in the
   * array.
   */
  while (--idx >= 0) {
    const node = nodes[idx];

    /*
     * Remove the node if it is not unique.
     * We are going through the array from the end, so we only
     * have to check nodes that preceed the node under consideration in the array.
     */
    if (idx > 0 && nodes.lastIndexOf(node, idx - 1) >= 0) {
      nodes.splice(idx, 1);
      continue;
    }

    for (
      let ancestor = node.type === 'root' ? undefined : node.parentNode;
      ancestor;
      ancestor = ancestor.type === 'root' ? undefined : ancestor.parentNode
    ) {
      if (nodes.includes(ancestor)) {
        nodes.splice(idx, 1);
        break;
      }
    }
  }

  return nodes;
};

/**
 * @param {function(XastElement):boolean} test
 * @param {XastNode[]} elems
 * @returns {XastElement[]}
 */
const findAll = (test, elems) => {
  const result = [];
  for (const elem of elems) {
    if (elem.type === 'element') {
      if (test(elem)) {
        result.push(elem);
      }
      result.push(...findAll(test, getChildren(elem)));
    }
  }
  return result;
};

/**
 * @param {function(XastElement):boolean} test
 * @param {XastNode[]} elems
 * @returns {XastElement|null}
 */
const findOne = (test, elems) => {
  for (const elem of elems) {
    if (elem.type === 'element') {
      if (test(elem)) {
        return elem;
      }
      const result = findOne(test, getChildren(elem));
      if (result) {
        return result;
      }
    }
  }
  return null;
};

const svgoCssSelectAdapter = {
  isTag,
  existsOne,
  getAttributeValue,
  getChildren,
  getName,
  getParent,
  getSiblings,
  getText,
  hasAttrib,
  removeSubsets,
  findAll,
  findOne,
};

export default svgoCssSelectAdapter;
