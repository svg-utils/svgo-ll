# createGroups

Creates `<g>` elements containing common properties for adjacent siblings.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The `<style>` element contains at least one rule.

Groups are only created for children of `<svg>` and `<g>` elements.

Adjacent siblings which have at least one common property are combined into a group. The following properties will be moved to the group if shared by all elements:

- Any inheritable properties.
- The `transform` and `transform-origin` properties, except that if both are present in the children, they are not moved to the group unless both can be moved.

All common properties are written to the group element as part of the `style` attribute, except for `transform`, which is written as an attribute.

The following are never put into a group:

- Elements which are referenced by a `<use>` element.
