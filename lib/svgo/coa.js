import fs from 'fs';
import path from 'path';
import colors from 'picocolors';
import { fileURLToPath } from 'url';
import { decodeSVGDatauri } from './tools.js';
import { loadConfig } from '../svgo-node.js';
import { SvgoParserError } from '../parser.js';
import { Command, Option } from 'commander';
import { readJSONFile } from './tools-node.js';
import { builtinPlugins, optimizeResolved, resolvePlugins } from '../svgo.js';

/**
/**
 * @typedef {{
 * input?:string[],
 * string?:string,
 * folder?:string,
 * recursive?:boolean,
 * stdin?:boolean,
 * exclude?:string[]|true,
 * output?:string[],
 * datauri?:string,
 * plugins?:string[]|true,
 * pre?:string[]|true,
 * post?:string[]|true,
 * enable?:string[]|true,
 * disable?:string[]|true,
 * options?:string,
 * maxPasses:string,
 * config?:string,
 * showPlugins?:boolean,
 * quiet?:boolean,
 * pretty?:boolean,
 * indent?:string,
 * finalNewline?:boolean,
 * eol?:string,
 * }} CommandOptions
 * @typedef {{quiet?:boolean,recursive?:boolean,exclude:RegExp[]}} CommandConfig
 * @typedef {import('../svgo.js').Config&CommandConfig} ExtendedConfig
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '../../package.json');
/** @type {{name:string,description:string,version:string,engines:{node:string}}} */
const PKG = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const regSVGFile = /\.svg$/i;

/**
 * Synchronously check if path is a directory. Tolerant to errors like ENOENT.
 *
 * @param {string} filePath
 */
export function checkIsDir(filePath) {
  try {
    return fs.lstatSync(filePath).isDirectory();
  } catch {
    return filePath.endsWith(path.sep);
  }
}

/**
 *  @returns {Command}
 */
export default function makeProgram() {
  const program = new Command();

  program
    .name(PKG.name)
    .description(PKG.description)
    .argument('[INPUT...]', 'Alias to --input')
    .option('-i, --input <INPUT...>', 'Input files, "-" for STDIN')
    .option('-s, --string <STRING>', 'Input SVG data string')
    .option(
      '-f, --folder <FOLDER>',
      'Input folder, optimize and rewrite all *.svg files',
    )
    .option(
      '-r, --recursive',
      "Use with '--folder'. Optimizes *.svg files in folders recursively.",
    )
    .option(
      '--exclude <PATTERN...>',
      "Use with '--folder'. Exclude files matching regular expression pattern.",
    )
    .option(
      '--plugins [pluginNames...]',
      'Run the specified plugins rather than default plugins',
    )
    .option(
      '--pre [pluginNames...]',
      'Run the specified pre-processing plugins rather than default pre-processing plugins',
    )
    .option(
      '--post [pluginNames...]',
      'Run the specified post-processing plugins rather than default post-processing plugins',
    )
    .option(
      '--enable <plugin...>',
      'Specify one or more builtin plugins to run in addition to default plugins or plugins in --config',
    )
    .addOption(
      new Option(
        '--options <FILENAME>',
        'Path to a JSON file containing configuration parameters for enabled plugins',
      ).conflicts('config'),
    )
    .option(
      '--disable <plugin...>',
      'Specify one or more plugins which should not be run',
    )
    .option(
      '--config <CONFIG>',
      'Custom config file, only .js, .mjs, and .cjs is supported',
    )
    .option(
      '--max-passes <INTEGER>',
      'Maximum number of iterations over the plugins.',
      '10',
    )
    .option(
      '-o, --output <OUTPUT...>',
      'Output file or folder (by default the same as the input), "-" for STDOUT',
    )
    .option(
      '--datauri <base64 | enc | unenc>',
      'Output as Data URI string (base64), URI encoded (enc) or unencoded (unenc)',
    )
    .option('--pretty', 'Add line breaks and indentation to output')
    .option(
      '--indent <INTEGER>',
      'Number of spaces to indent if --pretty is specified',
      '4',
    )
    .addOption(
      new Option(
        '--eol <lf | crlf>',
        'Line break to use when outputting SVG. If unspecified, the platform default is used',
      ).choices(['lf', 'crlf']),
    )
    .option('--final-newline', 'Ensure output ends with a line break')
    // used by picocolors internally
    .option('--no-color', 'Output plain text without color')
    .option(
      '-q, --quiet',
      'Only output error messages, not regular status messages',
    )
    .option('--show-plugins', 'Show available plugins and exit')
    .version(PKG.version, '-v, --version')
    .action(action);

  return program;
}

/**
 * @param {string[]} args
 * @param {CommandOptions} opts
 * @param {Command} command
 */
async function action(args, opts, command) {
  /** @type {string[]} */
  const input = opts.input || args;
  /** @type {string[]|string|undefined} */
  let output = opts.output;
  /** @type {ExtendedConfig} */
  let config = {};

  if (opts.datauri !== undefined) {
    if (
      opts.datauri !== 'base64' &&
      opts.datauri !== 'enc' &&
      opts.datauri !== 'unenc'
    ) {
      console.error(
        "error: option '--datauri' must have one of the following values: 'base64', 'enc' or 'unenc'",
      );
      process.exit(1);
    }
  }

  if (opts.indent !== undefined) {
    const number = Number.parseInt(opts.indent, 10);
    if (Number.isNaN(number)) {
      console.error(
        "error: option '--indent' argument must be an integer number",
      );
      process.exit(1);
    }
  }

  // --show-plugins
  if (opts.showPlugins) {
    showAvailablePlugins();
    return;
  }

  // w/o anything
  if (
    (input.length === 0 || input[0] === '-') &&
    !opts.string &&
    !opts.stdin &&
    !opts.folder &&
    process.stdin.isTTY === true
  ) {
    return command.help();
  }

  if (
    typeof process === 'object' &&
    process.versions &&
    process.versions.node &&
    PKG &&
    PKG.engines.node
  ) {
    const matches = String(PKG.engines.node).match(/\d*(\.\d+)*/);
    if (!matches || matches.length === 0) {
      throw new Error();
    }
    const nodeVersion = matches[0];
    if (parseFloat(process.versions.node) < parseFloat(nodeVersion)) {
      throw Error(
        `${PKG.name} requires Node.js version ${nodeVersion} or higher.`,
      );
    }
  }

  // --config
  let loadedConfig;
  if (opts.config) {
    loadedConfig = await loadConfig(opts.config);
    if (loadedConfig) {
      config = { ...loadedConfig, exclude: [] };
    }
  }

  // --quiet
  if (opts.quiet) {
    config.quiet = opts.quiet;
  }

  // --recursive
  if (opts.recursive) {
    config.recursive = opts.recursive;
  }

  // --exclude
  const excludeOpts = opts.exclude;
  config.exclude =
    typeof excludeOpts === 'object'
      ? excludeOpts.map((pattern) => RegExp(pattern))
      : [];

  if (opts.maxPasses) {
    config.maxPasses = Math.max(Math.min(parseInt(opts.maxPasses), 10), 1);
  }

  if (opts.plugins) {
    config.pluginNames = opts.plugins === true ? [] : opts.plugins;
  }
  if (opts.pre) {
    config.pre = opts.pre === true ? [] : opts.pre;
  }
  if (opts.post) {
    config.post = opts.post === true ? [] : opts.post;
  }
  if (opts.enable) {
    config.enable = opts.enable === true ? [] : opts.enable;
  }
  if (opts.disable) {
    config.disable = opts.disable === true ? [] : opts.disable;
  }
  if (opts.options && !loadedConfig) {
    config.options = readJSONFile(opts.options);
  }

  // --pretty
  if (opts.pretty) {
    config.js2svg = config.js2svg || {};
    config.js2svg.pretty = true;
    if (opts.indent !== undefined) {
      config.js2svg.indent = opts.indent;
    }
  }

  // --eol
  if (opts.eol) {
    config.js2svg = config.js2svg || {};
    config.js2svg.eol =
      opts.eol === 'lf' || opts.eol === 'crlf' ? opts.eol : undefined;
  }

  // --final-newline
  if (opts.finalNewline) {
    config.js2svg = config.js2svg || {};
    config.js2svg.finalNewline = true;
  }

  // --output
  if (output) {
    if (input.length && input[0] !== '-') {
      if (output.length === 1 && checkIsDir(output[0])) {
        const dir = output[0];
        for (let i = 0; i < input.length; i++) {
          output[i] = checkIsDir(input[i])
            ? input[i]
            : path.resolve(dir, path.basename(input[i]));
        }
      } else if (output.length < input.length) {
        output = output.concat(input.slice(output.length));
      }
    }
  } else if (input.length) {
    output = input;
  } else if (opts.string) {
    output = '-';
  }

  if (opts.datauri) {
    config.datauri = opts.datauri;
  }

  const resolvedPlugins = resolvePlugins(config);

  // --folder
  if (opts.folder) {
    const outputFolder = (output && output[0]) || opts.folder;
    await optimizeFolder(config, resolvedPlugins, opts.folder, outputFolder);
  }

  // --input
  if (input.length !== 0) {
    // STDIN
    if (input[0] === '-') {
      return new Promise((resolve, reject) => {
        if (output === undefined) {
          throw new Error();
        }
        let data = '';
        let file = output[0];

        process.stdin
          .on('data', (chunk) => (data += chunk))
          .once('end', () =>
            processSVGData(config, null, data, resolvedPlugins, file).then(
              resolve,
              reject,
            ),
          );
      });
      // file
    } else {
      await Promise.all(
        input.map((file, n) => {
          if (output === undefined) {
            throw new Error();
          }
          return optimizeFile(config, resolvedPlugins, file, output[n]);
        }),
      );
    }

    // --string
  } else if (opts.string) {
    if (output === undefined) {
      throw new Error();
    }
    const data = decodeSVGDatauri(opts.string);

    return processSVGData(config, null, data, resolvedPlugins, output[0]);
  }
}

/**
 * Optimize SVG files in a directory.
 *
 * @param {ExtendedConfig} config options
 * @param {import('../svgo.js').ResolvedPlugins} resolvedPlugins
 * @param {string} dir input directory
 * @param {string} output output directory
 * @return {Promise<any[]>}
 */
async function optimizeFolder(config, resolvedPlugins, dir, output) {
  if (!config.quiet) {
    console.log(`Processing directory '${dir}':\n`);
  }
  return fs.promises
    .readdir(dir)
    .then((files) =>
      processDirectory(config, resolvedPlugins, dir, files, output),
    );
}

/**
 * Process given files, take only SVG.
 *
 * @param {ExtendedConfig} config options
 * @param {string} dir input directory
 * @param {import('../svgo.js').ResolvedPlugins} resolvedPlugins
 * @param {string[]} files list of file names in the directory
 * @param {string} output output directory
 * @return {Promise<any[]>}
 */
function processDirectory(config, resolvedPlugins, dir, files, output) {
  // take only *.svg files, recursively if necessary
  const svgFilesDescriptions = getFilesDescriptions(config, dir, files, output);

  return svgFilesDescriptions.length
    ? Promise.all(
        svgFilesDescriptions.map((fileDescription) =>
          optimizeFile(
            config,
            resolvedPlugins,
            fileDescription.inputPath,
            fileDescription.outputPath,
          ),
        ),
      )
    : Promise.reject(
        new Error(`No SVG files have been found in '${dir}' directory.`),
      );
}

/**
 * Get SVG files descriptions.
 *
 * @param {ExtendedConfig} config options
 * @param {string} dir input directory
 * @param {string[]} files list of file names in the directory
 * @param {string} output output directory
 * @returns {{inputPath:string,outputPath:string}[]}
 */
function getFilesDescriptions(config, dir, files, output) {
  const filesInThisFolder = files
    .filter(
      (name) =>
        regSVGFile.test(name) &&
        !config.exclude.some((regExclude) => regExclude.test(name)),
    )
    .map((name) => ({
      inputPath: path.resolve(dir, name),
      outputPath: path.resolve(output, name),
    }));

  return config.recursive
    ? filesInThisFolder.concat(
        files
          .filter((name) => checkIsDir(path.resolve(dir, name)))
          .map((subFolderName) => {
            const subFolderPath = path.resolve(dir, subFolderName);
            const subFolderFiles = fs.readdirSync(subFolderPath);
            const subFolderOutput = path.resolve(output, subFolderName);
            return getFilesDescriptions(
              config,
              subFolderPath,
              subFolderFiles,
              subFolderOutput,
            );
          })
          .reduce((result, files) => result.concat(files), []),
      )
    : filesInThisFolder;
}

/**
 * Read SVG file and pass to processing.
 *
 * @param {ExtendedConfig} config options
 * @param {import('../svgo.js').ResolvedPlugins} resolvedPlugins
 * @param {string} file
 * @param {string} output
 * @return {Promise<void|any[]>}
 */
function optimizeFile(config, resolvedPlugins, file, output) {
  return fs.promises.readFile(file, 'utf8').then(
    (data) =>
      processSVGData(
        config,
        { path: file },
        data,
        resolvedPlugins,
        output,
        file,
      ),
    (error) =>
      checkOptimizeFileError(config, resolvedPlugins, file, output, error),
  );
}

/**
 * Optimize SVG data.
 *
 * @param {ExtendedConfig} config options
 * @param {{path:string}|null} info
 * @param {string} data SVG content to optimize
 * @param {import('../svgo.js').ResolvedPlugins} resolvedPlugins
 * @param {string} output where to write optimized file
 * @param {string} [input] input file name (being used if output is a directory)
 * @return {Promise<void>}
 */
function processSVGData(config, info, data, resolvedPlugins, output, input) {
  const startTime = Date.now();
  const prevFileSize = Buffer.byteLength(data, 'utf8');

  let result;
  try {
    result = optimizeResolved(data, { ...config, ...info }, resolvedPlugins);
  } catch (error) {
    if (error instanceof SvgoParserError) {
      console.error(colors.red(error.toString()));
      process.exit(1);
    } else {
      throw error;
    }
  }
  const resultFileSize = Buffer.byteLength(result.data, 'utf8'),
    processingTime = Date.now() - startTime;

  return writeOutput(input, output, result.data).then(
    function () {
      if (!config.quiet && output !== '-') {
        if (input) {
          console.log(`\n${path.basename(input)}:`);
        }
        console.log(
          `Done in ${processingTime} ms (${result.passes === 1 ? '1 pass' : `${result.passes} passes`})`,
        );
        printProfitInfo(prevFileSize, resultFileSize);
      }
    },
    (error) =>
      Promise.reject(
        new Error(
          error.code === 'ENOTDIR'
            ? `Error: output '${output}' is not a directory.`
            : error,
        ),
      ),
  );
}

/**
 * Write result of an optimization.
 *
 * @param {string|undefined} input
 * @param {string} output output file name. '-' for stdout
 * @param {string} data data to write
 * @return {Promise<void>}
 */
async function writeOutput(input, output, data) {
  if (output === '-') {
    process.stdout.write(data);
    return Promise.resolve();
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });

  return fs.promises
    .writeFile(output, data, 'utf8')
    .catch((error) => checkWriteFileError(input, output, data, error));
}

/**
 * Write optimizing stats in a human-readable format.
 *
 * @param {number} inBytes size before optimization.
 * @param {number} outBytes size after optimization.
 */
function printProfitInfo(inBytes, outBytes) {
  const profitPercent = 100 - (outBytes * 100) / inBytes;
  /** @type {[string, Function]} */
  const ui = profitPercent < 0 ? ['+', colors.red] : ['-', colors.green];

  console.log(
    Math.round((inBytes / 1024) * 1000) / 1000 + ' KiB',
    ui[0],
    ui[1](Math.abs(Math.round(profitPercent * 10) / 10) + '%'),
    '=',
    Math.round((outBytes / 1024) * 1000) / 1000 + ' KiB',
  );
}

/**
 * Check for errors, if it's a dir optimize the dir.
 *
 * @param {ExtendedConfig} config
 * @param {import('../svgo.js').ResolvedPlugins} resolvedPlugins
 * @param {string} input
 * @param {string} output
 * @param {NodeJS.ErrnoException} error
 * @return {Promise<any[]>}
 */
function checkOptimizeFileError(config, resolvedPlugins, input, output, error) {
  if (error.code === 'EISDIR') {
    return optimizeFolder(config, resolvedPlugins, input, output);
  } else if (error.code === 'ENOENT') {
    return Promise.reject(
      new Error(`Error: no such file or directory '${error.path}'.`),
    );
  }
  return Promise.reject(error);
}

/**
 * Check for saving file error. If the output is a dir, then write file there.
 *
 * @param {string|undefined} input
 * @param {string} output
 * @param {string} data
 * @param {NodeJS.ErrnoException} error
 * @return {Promise<void>}
 */
function checkWriteFileError(input, output, data, error) {
  if (error.code === 'EISDIR' && input) {
    return fs.promises.writeFile(
      path.resolve(output, path.basename(input)),
      data,
      'utf8',
    );
  } else {
    return Promise.reject(error);
  }
}

/** Show list of available plugins with short description. */
function showAvailablePlugins() {
  /** @type {import('../svgo.js').CustomPlugin[]} */
  const plugins = [];
  for (const values of builtinPlugins.values()) {
    plugins.push(values);
  }
  const list = plugins
    .map((plugin) => ` [ ${colors.green(plugin.name)} ] ${plugin.description}`)
    .join('\n');
  console.log('Currently available plugins:\n' + list);
}
