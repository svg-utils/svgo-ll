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
    if (visitor !== undefined) {
      /** @type {import('../svgo.js').OptimizationCallbackInfo} */
      const callbackInfo = {
        type: 'plugin',
        pluginName: plugin.name,
        event: 'begin',
        passNumber: info.passNumber,
      };
      callback(callbackInfo);
      visit(ast, visitor);
      callbackInfo.event = 'end';
      callback(callbackInfo);
    }
  }
};

/**
 * @param {import('../svgo.js').OptimizationCallbackInfo} _callbackInfo
 */
function defaultCallback(_callbackInfo) {
  // console.log(`${pluginName} - ${event} - ${passNumber}`);
}
