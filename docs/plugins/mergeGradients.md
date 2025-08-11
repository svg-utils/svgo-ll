# mergeGradients

Removes duplicate `<linearGradient>` and `<radialGradient>` elements.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

If identical gradients are found, all but one is removed, and all references to the removed gradients are replaced with a reference to the remaining gradient.

Gradient elements are not considered identical unless all of their children are `<stop>` elements.

Gradients whose `id` attributes are referenced by a CSS id selector are ignored.
