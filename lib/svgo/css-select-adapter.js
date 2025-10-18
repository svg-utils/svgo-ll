/**
 * @param {import('../types.js').XastNode} node
 * @returns {boolean}
 */
const isTag = (node) => {
  return node.type === 'element';
};

/**
 * @param {function(import('../types.js').XastNode):boolean} test
 * @param {import('../types.js').XastNode[]} elems
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
 * @param {import('../types.js').XastElement} elem
 * @param {string} name
 * @returns {string|undefined}
 */
function getAttributeValue(elem, name) {
  return elem.svgAtts.get(name)?.toString();
}

/**
 * @param {import('../types.js').XastNode} node
 * @returns {import('../types.js').XastChild[]}
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
 * @param {import('../types.js').XastElement} elemAst
 * @returns {string}
 */
const getName = (elemAst) => {
  return elemAst.local;
};

/**
 * @param {import('../types.js').XastElement} node
 * @returns {import('../types.js').XastElement|null}
 */
const getParent = (node) => {
  return node.parentNode.type === 'element' ? node.parentNode : null;
};

/**
 * @param {import('../types.js').XastNode} elem
 * @returns {import('../types.js').XastNode[]}
 */
const getSiblings = (elem) => {
  if (elem.type === 'root') {
    return [];
  }
  var parent = elem.parentNode;
  return parent ? getChildren(parent) : [];
};

/**
 * @param {import('../types.js').XastElement} node
 * @returns {string}
 */
const getText = (node) => {
  if (node.children[0].type === 'text') {
    return node.children[0].value;
  }
  return '';
};

/**
 * @param {import('../types.js').XastElement} elem
 * @param {string} name
 * @returns {boolean}
 */
const hasAttrib = (elem, name) => {
  return elem.attributes[name] !== undefined;
};

/**
 * @param {import('../types.js').XastNode[]} nodes
 * @returns {import('../types.js').XastNode[]}
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
 * @param {function(import('../types.js').XastElement):boolean} test
 * @param {import('../types.js').XastNode[]} elems
 * @returns {import('../types.js').XastElement[]}
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
 * @param {function(import('../types.js').XastElement):boolean} test
 * @param {import('../types.js').XastNode[]} elems
 * @returns {import('../types.js').XastElement|null}
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
