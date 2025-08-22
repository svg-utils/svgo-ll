import { visit } from '../xast.js';

/**
 * Plugins engine.
 *
 * @param {import('../types.js').XastRoot} ast input ast
 * @param {import('../types.js').PluginInfo} info
 * @param {import('../svgo.js').CustomPlugin[]} plugins
 * @param {Object<string,import('../svgo.js').Config|false>|null} overrides
 * @param {import('../svgo.js').OptimizationCallback} callback
 */
export const invokePlugins = (
  ast,
  info,
  plugins,
  overrides,
  callback = defaultCallback,
) => {
  for (const plugin of plugins) {
    if (plugin === null) {
      continue;
    }
    const override = overrides?.[plugin.name];
    if (override === false) {
      continue;
    }

    const params = { ...plugin.params, ...override };

    const visitor = plugin.fn(info, params);
    if (visitor != null) {
      callback(plugin.name, 'plugin begin', info.passNumber);
      visit(ast, visitor);
      callback(plugin.name, 'plugin end', info.passNumber);
    }
  }
};

/**
 * @param {string} _pluginName
 * @param {"plugin begin"|"plugin end"} _event
 * @param {number} _passNumber
 */
// eslint-disable-next-line no-unused-vars
function defaultCallback(_pluginName, _event, _passNumber) {
  // console.log(`${pluginName} - ${event} - ${passNumber}`);
}
