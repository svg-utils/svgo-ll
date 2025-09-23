# cleanupXlink

Changes `xlink:href` attributes to `href` attributes. If an `href` attribute is already present, the `xlink:href` attribute is removed.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The document has `<style>` elements with attribute selectors.
