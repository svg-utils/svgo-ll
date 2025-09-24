# removeUselessStrokeAndFill

Removes stroke and fill attributes and `style` attribute properties which do not affect rendering from shape elements.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The document has animated elements.

Elements with an `id` attribute are not changed.

If the `stroke` on the element is `none` or not defined, all stroke attributes and style properties are removed.

If the `fill` on the element is `none`, all other fill attributes and style properties are removed.
