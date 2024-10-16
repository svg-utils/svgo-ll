# Custom Configuration Files

If you are using only the builtin plugins distributed with **svgo-ll**, you should be able to do all configuration from the [command line](./command-line-options.md), but if you are using custom plugins or have a complex configuration, you may want to use a custom configuration file.

A custom configuration file is a JavaScript file that exports a [`Config` object](https://github.com/svg-utils/svgo-ll/blob/main/lib/svgo.d.ts), for example:

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
