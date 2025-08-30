import { defaultPlugins } from '../plugins/default-plugins.js';
import { parseSvg } from './parser.js';
import { stringifySvg } from './stringifier.js';
import { builtinPlugins } from './builtin.js';
import { invokePlugins } from './svgo/plugins.js';
import { encodeSVGDatauri, SVGOError } from './svgo/tools.js';
import { getDocData } from './docdata.js';
import { VERSION } from './version.js';
import _collections from '../plugins/_collections.js';

export { VERSION, builtinPlugins, _collections, defaultPlugins };

/**
 * @param {import('svgo-ll').Config} config
 * @returns {import('svgo-ll').CustomPlugin[]}
 */
export function resolvePlugins(config) {
  /**
   * @param {import('svgo-ll').Config} config
   * @returns {import('svgo-ll').CustomPlugin[]}
   */
  function getPlugins(config) {
    /**
     * @returns {import('svgo-ll').CustomPlugin[]}
     */
    function getPlugins() {
      if (config.plugins) {
        return config.plugins;
      }
      if (!config.pluginNames) {
        return defaultPlugins;
      }
      /** @type {import('svgo-ll').CustomPlugin[]} */
      if (!(config.pluginNames instanceof Array)) {
        config.pluginNames = [];
      }
      return resolvePluginsByName(config.pluginNames);
    }

    /**
     * @param {string[]} pluginNames
     * @param {import('svgo-ll').CustomPlugin[]} [initialPlugins=[]]
     * @returns {import('svgo-ll').CustomPlugin[]}
     */
    function resolvePluginsByName(pluginNames, initialPlugins = []) {
      return pluginNames.reduce((plugins, pluginName) => {
        const builtin = builtinPlugins.get(pluginName);
        if (builtin) {
          plugins.push(builtin);
        } else {
          console.warn(`plugin "${pluginName}" not found`);
        }
        return plugins;
      }, initialPlugins);
    }

    const plugins = getPlugins();
    if (config.enable) {
      resolvePluginsByName(config.enable, plugins);
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
      return !disabled.includes(p.name);
    });
  }

  // Add plugin params if specified
  const paramValues = config.options;
  if (paramValues) {
    plugins = plugins.map((p) => {
      const params = paramValues[p.name];
      return params ? { name: p.name, fn: p.fn, params: params } : p;
    });
  }

  return plugins;
}

/**
 * @param {string} input
 * @param {import('svgo-ll').Config} config
 * @param {import('svgo-ll').OptimizationCallback} callback
 * @returns {import('svgo-ll').Output}
 */
export function optimize(input, config, callback) {
  /**
   * @param {import('svgo-ll').Config} config
   * @returns {import('svgo-ll').CustomPlugin[]}
   */
  function getPlugins(config) {
    /**
     * @returns {import('svgo-ll').CustomPlugin[]}
     */
    function getPlugins() {
      if (config.plugins) {
        return config.plugins;
      }
      if (!config.pluginNames) {
        return defaultPlugins;
      }
      /** @type {import('svgo-ll').CustomPlugin[]} */
      if (!(config.pluginNames instanceof Array)) {
        config.pluginNames = [];
      }
      return resolvePlugins(config.pluginNames);
    }

    /**
     * @param {string[]} pluginNames
     * @param {import('svgo-ll').CustomPlugin[]} [initialPlugins=[]]
     * @returns {import('svgo-ll').CustomPlugin[]}
     */
    function resolvePlugins(pluginNames, initialPlugins = []) {
      return pluginNames.reduce((plugins, pluginName) => {
        const builtin = builtinPlugins.get(pluginName);
        if (builtin) {
          plugins.push(builtin);
        } else {
          console.warn(`plugin "${pluginName}" not found`);
        }
        return plugins;
      }, initialPlugins);
    }

    const plugins = getPlugins();
    if (config.enable) {
      resolvePlugins(config.enable, plugins);
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
      return !disabled.includes(p.name);
    });
  }

  // Add plugin params if specified
  const paramValues = config.options;
  if (paramValues) {
    plugins = plugins.map((p) => {
      const params = paramValues[p.name];
      return params ? { name: p.name, fn: p.fn, params: params } : p;
    });
  }

  return optimizeResolved(input, config, plugins, callback);
}

/**
 * @param {string} input
 * @param {import('svgo-ll').ResolvedConfig} config
 * @param {import('svgo-ll').CustomPlugin[]} resolvedPlugins
 * @param {import('svgo-ll').OptimizationCallback} [callback]
 * @returns {import('svgo-ll').Output}
 */
export function optimizeResolved(input, config, resolvedPlugins, callback) {
  let prevResultSize = Number.POSITIVE_INFINITY;
  let output = '';
  /** @type {import('./types.js').PluginInfo} */
  const info = {};
  if (config.path) {
    info.path = config.path;
  }

  const startTime = Date.now();
  let ast;
  let parseTime;
  try {
    const startParseTime = Date.now();
    ast = parseSvg(input, config.path);
    parseTime = Date.now() - startParseTime;

    info.docData = getDocData(ast);

    const maxPasses = config.maxPasses
      ? Math.max(Math.min(config.maxPasses, 10), 1)
      : 10;

    for (let i = 0; i < maxPasses; i += 1) {
      info.passNumber = i;
      invokePlugins(ast, info, resolvedPlugins, null, callback);
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
    } else if (error instanceof Error) {
      console.warn(error.stack ?? error.message);
    } else {
      console.warn(error);
    }
    return { data: input, error: error };
  }

  if (config.datauri) {
    output = encodeSVGDatauri(output, config.datauri);
  }
  return {
    data: output,
    passes: info.passNumber + 1,
    ast: ast,
    time: Date.now() - startTime,
    parseTime: parseTime,
  };
}

export default {
  VERSION,
  optimize,
  optimizeResolved,
  resolvePlugins,
  builtinPlugins,
  _collections,
  defaultPlugins,
};
