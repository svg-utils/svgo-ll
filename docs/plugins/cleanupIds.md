# cleanupIds

Removes unreferenced `id` attributes, and minifies id values that remain.

## Options

- `preserve`: **string[]** - a list of id values that will not be removed or minified
- `preservePrefixes`: **string[]** - a list of prefixes; any id values that begin with one of these prefixes will not be removed or minified

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
