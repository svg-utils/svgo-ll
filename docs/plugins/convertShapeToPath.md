# convertShapeToPath

Converts basic shapes to equivalent `<path>` elements.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The `<style>` element contains complex selectors.

`<rect>`, `<line>`, `<polygon>`, and `<polyline>` elements are converted to equivalent `<path>` elements.

Elements are not converted if:

- There is a CSS tag selector on the `path` element.
- There is a CSS tag selector on the element name.
- The units for the element are anything other than `px`.
