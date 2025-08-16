# FAQ

Examples

- [Just remove whitespace from a file](#comp-ws)
- [Run a single plugin](#comp-1plugin)
- [Disable one or more default plugins](#comp-disable)
- [Round decimal values](#comp-round)
- [Change the default options for a plugin](#comp-defaults)

## Examples

<a id="comp-ws"></a>

### Just remove whitespace from a file

Use `preset-none`. For example:

```
npx svgo-ll --preset none -i test.svg
```

<a id="comp-1plugin"></a>

### Run a single plugin

Use `preset-none` and `--enable`. For example:

```
npx svgo-ll --preset none --enable minifyPathData -i test.svg
```

<a id="comp-disable"></a>

### Disable one or more default plugins

Use the `--disable` command line option. For example:

```
npx svgo-ll --disable minifyPathData cleanupIds -i test.svg
```

<a id="comp-round"></a>

### Round decimal values

Rounding is not enabled by default. To enable the rounding plugin, use the [`--enable` command line option](./command-line-options.md#enable). For example, to add rounding to the default plugins:

```
npx svgo-ll -i test.svg --enable round
```

<a id="comp-defaults"></a>

### Change the default options for a plugin

You can change the default options for a plugin by creating a JSON file and using the [`--options` command line option](./command-line-options.md#options). For example, to use the default plugins and specify an id that should not be changed by the `cleanupIds` plugin, create file named `options.json` with the content:

```
{
  "cleanupIds": {
    "preserve": "abc"
  }
}
```

and use the command:

```
npx svgo-ll -i test.svg --options options.json
```
