# convertPathToUse

Convert `<path>` elements with identical `d` attributes to `<use>` elements.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements.

Paths which are very short may not be converted if they are used a small number of times.
