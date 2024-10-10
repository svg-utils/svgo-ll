# removeHiddenElems

Removes [non-rendered elements](https://svgwg.org/svg2-draft/render.html#TermNeverRenderedElement) that are not used.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The `<style>` element has features other than simple selectors or attribute selectors.

The following elements are removed, except as specified below:

- Any children of `<defs>` which have no id.
- If a non-rendering element with no `id` attribute is encountered outside of a `<defs>`, the element is changed to a `<defs>`, and its content is processed as above.
- Empty shape elements with no id.
- Elements with `display:none`.
- Elements with `opacity:0`.

The following are not removed:

- `<style>` and `<script>` children of `<defs>`.
- If a child of `<defs>` has no `id` attribute, it may contain descendants which have an `id` attribute. If this is the case, these descendants are moved up to become immediate children of the `<defs>` element.
- `<marker>` elements with `display:none`.
- `<g>` elements with `display:none` (these are converted to a `<defs>`, and their content is processed as above).
- Elements with `opacity:0` which are within a non-rendering element which is not removed.
