# cleanupStyleAttributes

Removes invalid style properties and unreferenced class attribute names.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

### `style` Attributes

Properties that are not valid for a particular element are removed.

For `<g>` elements whose only children are shapes, properties relating to text and fonts are removed.

The `style` attribute is removed from all animation elements.

The list of allowable properties comes from https://www.w3.org/TR/SVG2/styling.html#PresentationAttributes, and also includes the `font` shorthand property.

Empty `style` attributes are removed.

Numeric values in style properties are written in the most compact form.

Style attributes are not changed if the document has attribute selectors on the `style` attribute.

### `class` Attributes

Any class names in the `class` attribute which are not referenced by a style selector are removed. If all class names are removed, the class attribute is removed.

Class attributes are not changed if the document has attribute selectors on the `class` attribute.
