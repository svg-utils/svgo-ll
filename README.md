# svgo-ll

**svgo-ll** is a Node.js library and command-line application for optimizing SVG files, based on the [SVGO](https://www.npmjs.com/package/svgo) package. **svgo-ll** is focused on lossless optimization and compression.

## Why?

SVG files, especially those exported from vector editors, usually contain a lot of redundant information. This includes editor metadata, comments, hidden elements, default or suboptimal values, and other stuff that can be safely removed or converted without impacting rendering.

## Installation

You can install **svgo-ll** globally through npm. Alternatively, drop the global flag (`-g`) to use it in your Node.js project.

```sh
# npm
npm install -g svgo-ll
```

## Command-line usage

Process single files:

```sh
svgo-ll one.svg two.svg -o one.min.svg two.min.svg
```

Process a directory of files recursively with `-f`/`--folder`:

```sh
svgo-ll -f path/to/directory_with_svgs -o path/to/output_directory
```

Help for advanced usage:

```sh
svgo-ll --help
```

## Configuration

**svgo-ll** has a plugin architecture. You can find a list of the default plugins in the order they run in the [default preset](https://github.com/svg-utils/svgo-ll/blob/main/docs/preset-default.md) documentation.

**svgo-ll** reads the configuration from `svgo.config.mjs` or the `--config path/to/config.mjs` command-line option. Some other parameters can be configured though command-line options too.

**`svgo.config.mjs`**

```js
export default {
  datauri: 'base64', // 'base64'|'enc'|'unenc'
  js2svg: {
    indent: 4, // number
    pretty: false, // boolean
  },
  plugins: [
    'preset-default', // built-in plugins enabled by default
    'prefixIds', // enable built-in plugins by name

    // enable built-in plugins with an object to configure plugins
    {
      name: 'prefixIds',
      params: {
        prefix: 'uwu',
      },
    },
  ],
};
```

### Default preset

Instead of configuring **svgo-ll** from scratch, you can modify the default preset to suit your needs by configuring or disabling individual plugins.

**`svgo.config.mjs`**

```js
export default {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // disable a default plugin
          cleanupIds: false,

          // customize the params of a default plugin
          inlineStyles: {
            onlyMatchedOnce: false,
          },
        },
      },
    },
  ],
};
```

### Custom plugins

You can also specify custom plugins:

**`svgo.config.mjs`**

```js
import importedPlugin from './imported-plugin';

export default {
  plugins: [
    // plugin imported from another JavaScript file
    importedPlugin,

    // plugin defined inline
    {
      name: 'customPlugin',
      params: {
        paramName: 'paramValue',
      },
      fn: (ast, params, info) => {},
    },
  ],
};
```

## API usage

**svgo-ll** provides a few low level utilities.

### optimize

The core of **svgo-ll** is the `optimize` function.

```js
import { optimize } from 'svgo-ll';

const result = optimize(svgString, {
  path: 'path-to.svg', // recommended
  maxPasses: 3, // all other config fields are available here
});

const optimizedSvgString = result.data;
```

### loadConfig

If you write a tool on top of **svgo-ll** you may want to resolve the `svgo.config.mjs` file.

```js
import { loadConfig } from 'svgo-ll';

const config = await loadConfig();
```

You can also specify a path and customize the current working directory.

```js
const config = await loadConfig(configFile, cwd);
```

## License and Copyright

This software is released under the terms of the [MIT license](https://github.com/svg-utils/svgo-ll/blob/main/LICENSE).
