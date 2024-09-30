# inlineStyles

Moves style properties from `<style>` elements to the `style` attribute of matching elements.

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

Style properties are only moved if all of the following are true:

- The rule only matches a single element.
- The matched element does not already have a `style` attribute.
- The matching rule is not in a media query.
- The matching selector does not have pseudo-classes or pseudo-elements.

Any rules which are no longer necessary are removed from the `<style>` element.
