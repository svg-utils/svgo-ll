# convertImageToUse

Convert duplicate `<image>` elements to `<use>` elements.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements.

This plugin does the following:

- For `<image>` elements with identical `data` URLs in their `href` attribute
  - creates a single `<image>` in a `<defs>` element
  - converts the original `<image>` elements to `<use>` elements referencing the common image
