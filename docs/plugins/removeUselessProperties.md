# removeUselessProperties

Removes attributes and properties that are not used.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

The following attributes and properties are removed:

- Presentation properties are removed from shape elements that are not displayed (e.g., those only used to define a `<clipPath>`).
- Identity transforms are removed unless they override another transform.
