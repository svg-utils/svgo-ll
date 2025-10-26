import { defaultPlugins } from '../plugins/default-plugins.js';
import { parseSvg } from './parser.js';
import { stringifySvg } from './stringifier.js';
import { builtinPlugins } from '../plugins/builtin.js';
import { invokePlugins } from './svgo/plugins.js';
import { encodeSVGDatauri, SVGOError } from './svgo/tools.js';
import { getDocData } from './docdata.js';
import { VERSION } from './version.js';
import _collections from '../plugins/_collections.js';

export { VERSION, builtinPlugins, _collections, defaultPlugins };

/** @type {('pre'|'plugins'|'post')[]} */
const PHASES = ['pre', 'plugins', 'post'];

/**
 * @param {string} input
 * @param {import('svgo-ll').Config} config
 * @param {import('svgo-ll').OptimizationCallback} callback
 * @returns {import('svgo-ll').Output}
 */
export function optimize(input, config, callback) {
  return optimizeResolved(input, config, resolvePlugins(config), callback);
}

/**
 * @param {string} input
 * @param {import('svgo-ll').ResolvedConfig} config
 * @param {import('svgo-ll').ResolvedPlugins} resolvedPlugins
 * @param {import('svgo-ll').OptimizationCallback} [callback]
 * @returns {import('svgo-ll').Output}
 */
export function optimizeResolved(input, config, resolvedPlugins, callback) {
  let prevResultSize = Number.POSITIVE_INFINITY;
  let output = '';
  /** @type {import('./types.js').PluginInfo} */
  const info = {};
  if (config === undefined) {
    config = {};
  }
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

    // Run preprocessing
    if (resolvedPlugins.pre) {
      invokePlugins(ast, info, resolvedPlugins.pre, null, callback);
    }

    for (let i = 0; i < maxPasses; i += 1) {
      info.passNumber = i;
      invokePlugins(ast, info, resolvedPlugins.plugins, null, callback);
      output = stringifySvg(ast);
      if (output.length < prevResultSize) {
        prevResultSize = output.length;
      } else {
        break;
      }
    }
  } catch (error) {
    // If there's an error, show a message, and just return the input unchanged.
    if (error instanceof SVGOError) {
      console.warn(`${error.message} - file "${info.path}" not changed`);
    } else if (error instanceof Error) {
      console.warn(error.stack ?? error.message);
    } else {
      console.warn(error);
    }
    return { data: input, error: error };
  }
  const numPasses = info.passNumber + 1;

  // Run postprocessing
  if (resolvedPlugins.post && resolvedPlugins.post.length > 0) {
    info.passNumber = 0;
    invokePlugins(ast, info, resolvedPlugins.post, null, callback);
    output = stringifySvg(ast, config.js2svg);
  } else if (
    config.js2svg &&
    (config.js2svg.pretty ||
      config.js2svg.finalNewline ||
      config.js2svg.eol === 'crlf')
  ) {
    // Re-generate the output if non-default options were requested.
    output = stringifySvg(ast, config.js2svg);
  }

  if (config.datauri) {
    output = encodeSVGDatauri(output, config.datauri);
  }
  return {
    data: output,
    passes: numPasses,
    ast: ast,
    time: Date.now() - startTime,
    parseTime: parseTime,
  };
}

/**
 * @param {import('svgo-ll').Config} config
 * @returns {import('svgo-ll').ResolvedPlugins}
 */
export function resolvePlugins(config) {
  /**
   * @param {import('svgo-ll').Config} config
   * @returns {import('svgo-ll').ResolvedPlugins}
   */
  function getPlugins(config) {
    /**
     * @param {import('svgo-ll').CustomPlugin[]} initialPlugins
     * @param {string[]} pluginNames
     * @returns {import('svgo-ll').CustomPlugin[]}
     */
    function enableAdditionalPlugins(initialPlugins, pluginNames) {
      pluginNames.forEach((pluginName) => {
        const builtin = builtinPlugins.get(pluginName);
        if (builtin) {
          initialPlugins.push(builtin);
        } else {
          console.warn(`plugin "${pluginName}" not found`);
        }
      });
      return initialPlugins;
    }

    /** @type {import('svgo-ll').ResolvedPlugins|undefined} */
    let plugins;
    if (config.plugins) {
      plugins = config.plugins;
    } else if (config.pluginNames) {
      plugins = {
        pre: [],
        plugins: enableAdditionalPlugins([], config.pluginNames),
        post: [],
      };
    } else {
      plugins = {
        pre: defaultPlugins.pre.slice(),
        plugins: defaultPlugins.plugins.slice(),
        post: defaultPlugins.post.slice(),
      };
    }
    if (config.pre) {
      plugins.pre = enableAdditionalPlugins([], config.pre);
    }
    if (config.post) {
      plugins.post = enableAdditionalPlugins([], config.post);
    }

    if (config.enable) {
      enableAdditionalPlugins(plugins.plugins, config.enable);
    }

    return plugins;
  }

  if (!config) {
    config = {};
  }

  const disabled = config.disable ?? [];
  let plugins = getPlugins(config);
  if (disabled.length > 0) {
    PHASES.forEach((phase) => {
      if (plugins[phase]) {
        plugins[phase] = plugins[phase].filter((p) => {
          return !disabled.includes(p.name);
        });
      }
    });
  }

  // Add plugin params if specified
  const paramValues = config.options;
  if (paramValues) {
    PHASES.forEach((phase) => {
      plugins[phase] = plugins[phase].map((p) => {
        const params = paramValues[p.name];
        return params ? { name: p.name, fn: p.fn, params: params } : p;
      });
    });
  }

  return plugins;
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
