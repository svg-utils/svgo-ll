import { defaultPlugins } from '../plugins/default-plugins.js';
import { parseSvg } from './parser.js';
import { stringifySvg } from './stringifier.js';
import { builtin } from './builtin.js';
import { invokePlugins } from './svgo/plugins.js';
import { encodeSVGDatauri, SVGOError } from './svgo/tools.js';
import { getDocData } from './docdata.js';
import { VERSION } from './version.js';
import _collections from '../plugins/_collections.js';

const pluginsMap = new Map();
for (const plugin of builtin) {
  pluginsMap.set(plugin.name, plugin);
}

/**
 * @param {string} name
 * @returns {import('svgo-ll').CustomPlugin}
 */
function getPlugin(name) {
  return pluginsMap.get(name);
}

/**
 * @param {import('./svgo.js').CustomPlugin} plugin
 * @param {string[]} disabled
 * @param {Record<string,{}>|undefined} options
 * @returns {import('svgo-ll').CustomPlugin}
 */
function resolvePluginConfig(plugin, disabled, options = {}) {
  let resolvedPlugin;
  let builtinPlugin;
  if (typeof plugin === 'string') {
    // resolve builtin plugin specified as string
    builtinPlugin = getPlugin(plugin);
    resolvedPlugin = {
      name: plugin,
      params: {},
      fn: builtinPlugin.fn,
    };
  } else if (typeof plugin === 'object') {
    // use custom plugin implementation
    let fn = 'fn' in plugin ? plugin.fn : undefined;
    if (!fn) {
      // resolve builtin plugin implementation
      builtinPlugin = getPlugin(plugin.name);
      fn = builtinPlugin.fn;
    }
    resolvedPlugin = {
      name: plugin.name,
      params: plugin.params,
      fn,
    };
  } else {
    throw new Error();
  }

  // Override with command line options.
  if (options[resolvedPlugin.name]) {
    resolvedPlugin.params = options[resolvedPlugin.name];
  }

  return resolvedPlugin;
}

export { VERSION, builtin as builtinPlugins, _collections };

/**
 * @param {string} input
 * @param {import('svgo-ll').Config} config
 * @returns {import('svgo-ll').Output}
 */
export function optimize(input, config) {
  /**
   * @param {import('svgo-ll').Config} config
   * @returns {import('svgo-ll').CustomPlugin[]}
   */
  function getPlugins(config) {
    /**
     * @returns {import('svgo-ll').CustomPlugin[]}
     */
    function getPreset() {
      if (config.plugins) {
        return config.plugins;
      }
      if (!config.pluginNames) {
        return defaultPlugins;
      }
      return [];
    }

    const plugins = getPreset();
    if (config.enable) {
      for (const builtinName of config.enable) {
        const builtin = pluginsMap.get(builtinName);
        if (builtin) {
          plugins.push(builtin);
        } else {
          console.warn(`plugin "${builtinName}" not found`);
        }
      }
    }

    return plugins;
  }

  if (!config) {
    config = {};
  }

  const disabled = config.disable ?? [];
  let plugins = getPlugins(config);
  if (disabled.length > 0) {
    plugins = plugins.filter((p) => {
      if (typeof p === 'string') {
        return !disabled.includes(p);
      }
      return !disabled.includes(p.name);
    });
  }

  const resolvedPlugins = plugins.map((p) =>
    resolvePluginConfig(p, disabled, config.options),
  );

  return optimizeResolved(input, config, resolvedPlugins);
}

/**
 * @param {string} input
 * @param {{path?:string,maxPasses?:number}&{js2svg?:import('./types.js').StringifyOptions, datauri?:import('./types.js').DataUri}} config
 * @param {import('svgo-ll').CustomPlugin[]} resolvedPlugins
 * @returns {import('svgo-ll').Output}
 */
function optimizeResolved(input, config, resolvedPlugins) {
  let prevResultSize = Number.POSITIVE_INFINITY;
  let output = '';
  /** @type {import('./types.js').PluginInfo} */
  const info = {};
  if (config.path) {
    info.path = config.path;
  }

  let ast;
  try {
    ast = parseSvg(input, config.path);

    info.docData = getDocData(ast);

    const maxPasses = config.maxPasses
      ? Math.max(Math.min(config.maxPasses, 10), 1)
      : 10;

    for (let i = 0; i < maxPasses; i += 1) {
      info.passNumber = i;
      invokePlugins(ast, info, resolvedPlugins, null);
      output = stringifySvg(ast, config.js2svg);
      if (output.length < prevResultSize) {
        prevResultSize = output.length;
      } else {
        break;
      }
    }
  } catch (error) {
    // If there's an error, show a message, and just return the input unchanged.
    if (error instanceof SVGOError) {
      console.warn(`${error.message} - file not changed`);
    } else {
      console.warn(error);
    }
    return { data: input, error: error, passes: 0 };
  }

  if (config.datauri) {
    output = encodeSVGDatauri(output, config.datauri);
  }
  return {
    data: output,
    passes: info.passNumber + 1,
    ast: ast,
  };
}

export default {
  VERSION,
  optimize,
  builtinPlugins: builtin,
  _collections,
};
