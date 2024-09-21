import * as csstree from 'css-tree';

/**
 * @param {string|undefined} css
 * @returns {Map<string,string>}
 */
export function _parseStyleDeclarations(css) {
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
      declarations.set(
        cssNode.property.toLowerCase(),
        csstree.generate(cssNode.value),
      );
    }
  });
  return declarations;
}
