/**
 * @typedef {import('../../lib/types.js').XastElement} XastElement
 * @typedef {import('../../lib/types.js').XastRoot} XastRoot
 */

import { visit, visitSkip, detachNodeFromParent } from '../../lib/xast.js';

/**
 * @type {(children: XastElement[]) => XastRoot}
 */
const root = (children) => {
  return { type: 'root', children };
};

/**
 * @type {(
 *   name: string,
 *   parentNode: import('../../lib/types.js').XastParent,
 *   attrs?: ?Record<string, string>,
 *   children?: XastElement[]
 * ) => XastElement}
 */
const x = (name, parentNode, attrs = null, children = []) => {
  return {
    type: 'element',
    parentNode: parentNode,
    name,
    attributes: attrs || {},
    children,
  };
};

function makeAst() {
  const ast = root([]);
  const g = x('g', ast);
  g.children = [x('rect', g), x('circle', g)];
  ast.children = [g, x('ellipse', ast)];
  return ast;
}

test('visit enters into nodes', () => {
  const ast = makeAst();
  /**
   * @type {string[]}
   */
  const entered = [];
  visit(ast, {
    root: {
      enter: (node) => {
        entered.push(node.type);
      },
    },
    element: {
      enter: (node) => {
        entered.push(`${node.type}:${node.name}`);
      },
    },
  });
  expect(entered).toStrictEqual([
    'root',
    'element:g',
    'element:rect',
    'element:circle',
    'element:ellipse',
  ]);
});

test('visit exits from nodes', () => {
  const ast = makeAst();
  /**
   * @type {string[]}
   */
  const exited = [];
  visit(ast, {
    root: {
      exit: (node) => {
        exited.push(node.type);
      },
    },
    element: {
      exit: (node) => {
        exited.push(`${node.type}:${node.name}`);
      },
    },
  });
  expect(exited).toStrictEqual([
    'element:rect',
    'element:circle',
    'element:g',
    'element:ellipse',
    'root',
  ]);
});

test('visit skips entering children if node is detached', () => {
  /**
   * @type {string[]}
   */
  const entered = [];
  const ast = makeAst();
  visit(ast, {
    element: {
      enter: (node) => {
        entered.push(node.name);
        if (node.name === 'g') {
          detachNodeFromParent(node);
        }
      },
    },
  });
  expect(entered).toStrictEqual(['g', 'ellipse']);
  const expected = root([]);
  expected.children = [x('ellipse', expected)];
  expect(ast).toStrictEqual(expected);
});

test('visit skips entering children when symbol is passed', () => {
  /**
   * @type {string[]}
   */
  const entered = [];
  const ast = makeAst();
  visit(ast, {
    element: {
      enter: (node) => {
        entered.push(node.name);
        if (node.name === 'g') {
          return visitSkip;
        }
      },
    },
  });
  expect(entered).toStrictEqual(['g', 'ellipse']);
  expect(ast).toStrictEqual(makeAst());
});
