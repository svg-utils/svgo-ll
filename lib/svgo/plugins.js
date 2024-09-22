import { visit } from '../xast.js';

/**
 * @typedef {import('../svgo.js').BuiltinPlugin<string, Object>} BuiltinPlugin
 * @typedef {import('../svgo.js').BuiltinPluginOrPreset<?, ?>} BuiltinPreset
 */

/**
 * Plugins engine.
 *
 * @module plugins
 *
 * @param {import('../types.js').XastRoot} ast input ast
 * @param {import('../types.js').PluginInfo} info
 * @param {({ name: string; params?: any; fn: import('../../plugins/plugins-types.js').Plugin<any>; } | null)[]} plugins
 * @param {Object<string,import('../svgo.js').Config|false>|null} overrides
 * @param {import('../svgo.js').Config} globalOverrides
 */
export const invokePlugins = (
  ast,
  info,
  plugins,
  overrides,
  globalOverrides,
) => {
  for (const plugin of plugins) {
    if (plugin === null) {
      continue;
    }
    const override = overrides?.[plugin.name];
    if (override === false) {
      continue;
    }
    if (
      globalOverrides.disable &&
      globalOverrides.disable.includes(plugin.name)
    ) {
      continue;
    }
    const params = { ...plugin.params, ...globalOverrides, ...override };

    const visitor = plugin.fn(ast, params, info);
    if (visitor != null) {
      visit(ast, visitor);
    }
  }
};

/**
 * @param {{ name: string,description?:string, plugins: ({ name: string; params?: any; fn: import('../../plugins/plugins-types.js').Plugin<any>; } )[] }} arg0
 * @returns {BuiltinPreset}
 */
export const createPreset = ({ name, plugins, description }) => {
  return {
    name,
    description: description,
    isPreset: true,
    plugins: Object.freeze(plugins),
    fn: (ast, params, info) => {
      const { floatPrecision, disable, overrides } = params;
      /** @type {import('../svgo.js').Config} */
      const globalOverrides = { disable: disable };
      if (floatPrecision != null) {
        globalOverrides.floatPrecision = floatPrecision;
      }
      if (overrides) {
        const pluginNames = plugins.map(({ name }) => name);
        for (const pluginName of Object.keys(overrides)) {
          if (!pluginNames.includes(pluginName)) {
            console.warn(
              `You are trying to configure ${pluginName} which is not part of ${name}.\n` +
                `Try to put it before or after, for example\n\n` +
                `plugins: [\n` +
                `  {\n` +
                `    name: '${name}',\n` +
                `  },\n` +
                `  '${pluginName}'\n` +
                `]\n`,
            );
          }
        }
      }
      invokePlugins(ast, info, plugins, overrides, globalOverrides);
    },
  };
};
