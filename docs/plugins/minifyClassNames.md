# minifyClassNames

Shortens class names and updates `class` attributes and `<style>` elements with the shortened names.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The document has attribute selectors which reference the `class` attribute.

Minified class names are base 62 numbers (0-9a-zA-Z) which do not have a leading digit.

The most frequently referenced classes are given the shortest minified class names.
