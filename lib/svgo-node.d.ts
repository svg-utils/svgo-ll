import { Config } from './svgo.js';

export * from './svgo.js';

/**
 * If you write a tool on top of svgo you might need a way to load svgo config.
 *
 * You can also specify relative or absolute path and customize current working directory.
 */
export declare function loadConfig(
  configFile: string | undefined,
  cwd?: string,
): Promise<Config>;
