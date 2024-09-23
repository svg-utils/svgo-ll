import * as csstree from 'css-tree';

/**
 * @param {string|undefined} css
 * @returns {Map<string,import('./types.js').CSSPropertyValue>}
 */
export function _parseStyleDeclarations(css) {
  /** @type {Map<string,import('./types.js').CSSPropertyValue>} */
  const declarations = new Map();
  if (css === undefined) {
    return declarations;
  }
  const ast = csstree.parse(css, {
    context: 'declarationList',
    parseValue: false,
  });
  csstree.walk(ast, (cssNode) => {
    if (cssNode.type === 'Declaration') {
      declarations.set(cssNode.property.toLowerCase(), {
        value: csstree.generate(cssNode.value),
        important: !!cssNode.important,
      });
    }
  });
  return declarations;
}
