# minifyIds

Shortens `id` attributes and references to them.

## Options

- `preserve`: **string[]** - a list of id values that will not be changed
- `preservePrefixes`: **string[]** - a list of prefixes; any id values that begin with one of these prefixes will not be changed

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The document has animated elements.

Minified ids are base 62 numbers (0-9a-zA-Z) which do not have a leading digit.

The most frequently referenced ids are given the shortest minified ids.
