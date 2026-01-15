# mergeFilters

Combines identical `<filter>` elements and removes duplicates.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

Duplicate `<filter>` elements are removed, and references to the removed elements are updated to reference the single remaining `<filter>` element.
