# cleanupTextElements

Simplifies and merges `<text>` and `<tspan>` elements.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements.

This plugin makes the following transformations:

- Removes `xml:space="preserve"` if the element does not contain significant whitespace.
- Removes unused `x` and `y` attributes from `<text>` elements.
- Merges `<text>` and `<tspan>` elements where possible.
