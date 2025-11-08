# cleanupTextNodes

Removes text nodes from SVG elements.

## Details

Text node children are removed from elements if:

- The element is in the SVG namespace.
- The element is anything other than `a`,
  `desc`,
  `script`,
  `style`,
  `text`,
  `textPath`,
  `title`, or
  `tspan`.
