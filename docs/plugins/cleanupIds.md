# cleanupIds

Removes unreferenced `id` attributes.

## Options

- `preserve`: **string[]** - a list of id values that will not be removed
- `preservePrefixes`: **string[]** - a list of prefixes; any id values that begin with one of these prefixes will not be removed

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
