# minifyGradients

Simplifies and merges gradients.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

This plugin makes the following transformations:

- `stop` attributes are written in the shortest format (for example, `"90%"` becomes `".9"`).
- If a gradient consists of a single solid color, any references to the gradient are changed to use the color itself.
- If a gradient is used as a [template](https://svgwg.org/svg2-draft/pservers.html#PaintServerTemplates) and is only referenced once, the template is merged with the referencing gradient.
