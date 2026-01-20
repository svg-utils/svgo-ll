# minifyPatterns

Combines `<pattern>` elements and removes unused attributes.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

The plugin does the following:

- Merges template patterns which are only referenced once into the referencing `<pattern>`.
- Eliminates duplicate patterns.
- Removes attributes in template patterns which are not used.
- Removes patterns with an invalid `href` attribute.
