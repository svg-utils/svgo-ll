# FAQ

Compression

- [Just remove whitespace from a file](#comp-ws)
- [Run a single plugin](#comp-1plugin)

## Compression

<a id="comp-1plugin"></a>

### Run a single plugin

Use `preset-none` and `--enable`. For example:

```
npx svgo-ll --preset none --enable minifyPathData -i test.svg
```

<a id="comp-ws"></a>

### Just remove whitespace from a file

Use `preset-none`. For example:

```
npx svgo-ll --preset none -i test.svg
```
