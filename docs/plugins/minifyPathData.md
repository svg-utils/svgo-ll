# minifyPathData

Rewrites the `d` attribute of `path` elements in a more compact form.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The `<style>` element has rules with an attribute selector on the `d` attribute.
