# cleanupGradientAttributes

Removes unnecessary `<linearGradient>` and `<radialGradient>` attributes.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements.

The plugin does the following:

- If `gradientUnits="userSpaceOnUse"`, converts to `objectBoundingBox` if possible, and adjust the values of other attributes.
- Applies the `gradientTransform` directly to the coordinates if possible.
- Removes attributes which are not needed because they are default values.
- Removes attributes which are not needed because they are always overridden.
