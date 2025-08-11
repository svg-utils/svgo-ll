# removeEmptyContainers

Removes empty elements which do not affect rendering.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

The following elements are removed:

- `<a>`,
  `<defs>`,
  `<foreignObject>`,
  `<g>`,
  `<marker>`,
  `<mask>`,
  `<missing-glyph>`,
  `<pattern>`,
  `<switch>`,
  `<symbol>`,
  `<text>`, and
  `<tspan>` elements which have no children.
- `<use>` elements which reference empty containers.

The following empty elements are not removed:

- `<pattern>` elements with attributes.
- `<g>` elements with a filter.
- `<mask>` elements with an `id` attribute.
- Elements which are children of a `<switch>` element.
