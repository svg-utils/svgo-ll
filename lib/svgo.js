import { parseSvg } from './parser.js';
import { stringifySvg } from './stringifier.js';
import { builtin } from './builtin.js';
import { invokePlugins } from './svgo/plugins.js';
import { encodeSVGDatauri } from './svgo/tools.js';
import { getDocData } from './docdata.js';
import { VERSION } from './version.js';
import _collections from '../plugins/_collections.js';

/**
 * @typedef {import('./svgo.js').BuiltinPluginOrPreset<?, ?>} BuiltinPluginOrPreset
 */

const pluginsMap = new Map();
for (const plugin of builtin) {
  pluginsMap.set(plugin.name, plugin);
}

/**
 * @param {string} name
 * @returns {BuiltinPluginOrPreset}
 */
function getPlugin(name) {
  if (name === 'removeScriptElement') {
    console.warn(
      'Warning: removeScriptElement has been renamed to removeScripts, please update your SVGO config',
    );
    return pluginsMap.get('removeScripts');
  }

  return pluginsMap.get(name);
}

/**
 * @param {import('./svgo.js').PluginConfig} plugin
 */
const resolvePluginConfig = (plugin) => {
  if (typeof plugin === 'string') {
    // resolve builtin plugin specified as string
    const builtinPlugin = getPlugin(plugin);
    if (builtinPlugin == null) {
      throw Error(`Unknown builtin plugin "${plugin}" specified.`);
    }
    return {
      name: plugin,
      params: {},
      fn: builtinPlugin.fn,
    };
  }
  if (typeof plugin === 'object' && plugin != null) {
    if (plugin.name == null) {
      throw Error(`Plugin name must be specified`);
    }
    // use custom plugin implementation
    let fn = 'fn' in plugin ? plugin.fn : undefined;
    if (!fn) {
      // resolve builtin plugin implementation
      const builtinPlugin = getPlugin(plugin.name);
      if (builtinPlugin == null) {
        throw Error(`Unknown builtin plugin "${plugin.name}" specified.`);
      }
      fn = builtinPlugin.fn;
    }
    return {
      name: plugin.name,
      params: plugin.params,
      fn,
    };
  }
  return null;
};

export { VERSION, builtin as builtinPlugins, _collections };

/**
 * @param {string} input
 * @param {import('./svgo.js').Config} config
 */
export const optimize = (input, config) => {
  if (!config) {
    config = {};
  }
  if (typeof config !== 'object') {
    throw Error('Config should be an object');
  }
  let prevResultSize = Number.POSITIVE_INFINITY;
  let output = '';
  /** @type {import('./types.js').PluginInfo} */
  const info = {};
  if (config.path != null) {
    info.path = config.path;
  }

  const ast = parseSvg(input, config.path);
  info.docData = getDocData(ast);

  const maxPasses = config.maxPasses
    ? Math.max(Math.min(config.maxPasses, 10), 1)
    : 10;
  for (let i = 0; i < maxPasses; i += 1) {
    info.passNumber = i;
    const plugins = config.plugins || ['preset-default'];
    if (!Array.isArray(plugins)) {
      throw Error('malformed config, `plugins` property must be an array.');
    }
    const resolvedPlugins = plugins
      .filter((plugin) => plugin != null)
      .map(resolvePluginConfig);

    if (resolvedPlugins.length < plugins.length) {
      console.warn(
        'Warning: plugins list includes null or undefined elements, these will be ignored.',
      );
    }
    /** @type {import('./svgo.js').Config} */
    const globalOverrides = {};
    if (config.floatPrecision != null) {
      globalOverrides.floatPrecision = config.floatPrecision;
    }
    invokePlugins(ast, info, resolvedPlugins, null, globalOverrides);
    output = stringifySvg(ast, config.js2svg);
    if (output.length < prevResultSize) {
      prevResultSize = output.length;
    } else {
      break;
    }
  }
  if (config.datauri) {
    output = encodeSVGDatauri(output, config.datauri);
  }
  return {
    data: output,
    ast: ast,
  };
};

export default {
  VERSION,
  optimize,
  builtinPlugins: builtin,
  _collections,
};