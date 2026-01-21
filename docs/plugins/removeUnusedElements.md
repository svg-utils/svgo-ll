# removeUnusedElements

Removes unrendered elements.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The document has selectors other than class, id, or element name selectors.

The following elements are removed:

- Those where `display` is `none`.
- Those where `opacity` is `0` and which are not otherwise referenced.
- `<circle>` or `<ellipse>` elements where radius is `0`.
- `<rect>` elements where `width` or `height` is `0`.
- `<clipPath>` elements with no visible content, along with an elements whose `clip-path` references them.
- `<linearGradient>` elements that reference a non-existent template.
- `<use>` elements which that reference a non-existent element.
- Those with no `id` which are not displayed and not otherwise referenced.

The following attributes are modified:

- `fill` or `stroke` that references a non-existent paint server is changed to `none`.
- `id` attributes which are not referenced are removed.

Additional actions:

- Some elements that are not directly referenced or displayed, but contain referenced content, are converted to `<defs>`.
- Some elements that are not directly referenced or displayed, but contain referenced content, are removed, and there referenced children are made direct children of a `<defs>` element.
- All `<defs>` elements are combined into a single element.
