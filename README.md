# svgo-ll [![npm](https://img.shields.io/npm/v/svgo-ll)](https://npmjs.org/package/svgo-ll)

**svgo-ll** is a Node.js library and command-line application for optimizing SVG files, evolved from the [SVGO](https://www.npmjs.com/package/svgo) package. **svgo-ll** is focused on lossless optimization and compression.

## Why?

SVG files, especially those exported from vector editors, usually contain a lot of redundant information. This includes editor metadata, comments, hidden elements, default or suboptimal values, and other stuff that can be safely removed or converted without impacting rendering.

## Installation

You can install **svgo-ll** globally through npm. Alternatively, drop the global flag (`-g`) to use it in your Node.js project.

```sh
# npm
npm install -g svgo-ll
```

## Command-line usage

To process a single file with the default settings for **svgo-ll** version 5:

```sh
svgo-ll -i one.svg -o one.min.svg
```

To process a single file with the latest settings (which will become the defaults for **svgo-ll** version 6):

```sh
svgo-ll --preset next -i one.svg -o one.min.svg
```

For more detailed options, see the [command line option documentation](https://github.com/svg-utils/svgo-ll/blob/main/docs/command-line-options.md) or [FAQ](https://github.com/svg-utils/svgo-ll/blob/main/docs/faq.md).

## License and Copyright

This software is released under the terms of the [MIT license](https://github.com/svg-utils/svgo-ll/blob/main/LICENSE).
