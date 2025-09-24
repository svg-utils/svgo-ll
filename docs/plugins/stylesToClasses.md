# stylesToClasses

Converts presentation attributes and properties to classes when it makes the file smaller.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The `<style>` element has attribute selectors.

If combinations of presentation attributes and properties are used by multiple elements, they are converted to classes and new `<style>` rules are created if they make the file smaller.
