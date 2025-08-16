import os from 'os';
import fs from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import {
  VERSION,
  optimize as optimizeAgnostic,
  builtinPlugins,
  _collections,
  defaultPlugins,
} from './svgo.js';

/**
 * @param {string} configFile
 */
const importConfig = async (configFile) => {
  // dynamic import expects file url instead of path and may fail
  // when windows path is provided
  const imported = await import(pathToFileURL(configFile).toString());
  const config = imported.default;

  if (config == null || typeof config !== 'object' || Array.isArray(config)) {
    throw Error(`Invalid config file "${configFile}"`);
  }
  return config;
};

/**
 * @param {string} file
 */
const isFile = async (file) => {
  try {
    const stats = await fs.promises.stat(file);
    return stats.isFile();
  } catch {
    return false;
  }
};

export { VERSION, builtinPlugins, _collections, defaultPlugins };

/**
 * @param {string} configFile
 * @param {string} cwd
 */
export const loadConfig = async (configFile, cwd = process.cwd()) => {
  if (configFile != null) {
    if (path.isAbsolute(configFile)) {
      return await importConfig(configFile);
    } else {
      return await importConfig(path.join(cwd, configFile));
    }
  }
  let dir = cwd;

  while (true) {
    const js = path.join(dir, 'svgo.config.js');
    if (await isFile(js)) {
      return await importConfig(js);
    }
    const mjs = path.join(dir, 'svgo.config.mjs');
    if (await isFile(mjs)) {
      return await importConfig(mjs);
    }
    const cjs = path.join(dir, 'svgo.config.cjs');
    if (await isFile(cjs)) {
      return await importConfig(cjs);
    }
    const parent = path.dirname(dir);
    if (dir === parent) {
      return null;
    }
    dir = parent;
  }
};

/**
 * @param {string} input
 * @param {import('./svgo.js').Config} config
 * @returns
 */
export const optimize = (input, config) => {
  if (config == null) {
    config = {};
  }
  if (typeof config !== 'object') {
    throw Error('Config should be an object');
  }
  return optimizeAgnostic(input, {
    ...config,
    js2svg: {
      // platform specific default for end of line
      eol: os.EOL === '\r\n' ? 'crlf' : 'lf',
      ...config.js2svg,
    },
  });
};

export default {
  VERSION,
  loadConfig,
  optimize,
  builtinPlugins,
  _collections,
  defaultPlugins,
};
