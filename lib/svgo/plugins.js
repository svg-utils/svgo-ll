import { visit } from '../xast.js';

/**
 * Plugins engine.
 *
 * @module plugins
 *
 * @param {import('../types.js').XastRoot} ast input ast
 * @param {import('../types.js').PluginInfo} info
 * @param {import('../svgo.js').CustomPlugin[]} plugins
 * @param {Object<string,import('../svgo.js').Config|false>|null} overrides
 */
export const invokePlugins = (ast, info, plugins, overrides) => {
  for (const plugin of plugins) {
    if (plugin === null) {
      continue;
    }
    const override = overrides?.[plugin.name];
    if (override === false) {
      continue;
    }

    const params = { ...plugin.params, ...override };

    const visitor = plugin.fn(ast, params, info);
    if (visitor != null) {
      visit(ast, visitor);
    }
  }
};
