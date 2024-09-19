# removeUnknownsAndDefaults

Removes unknown elements and attributes, as well as attributes that are set to their default value.
It also removes the the `standalone` declaration from the DTD if [`standalone`](https://www.w3.org/TR/REC-xml/#sec-rmd) is set to `no`.

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

The following elements are not processed:

- Any element with a namespace prefix.
- Any `<foreignObject>` elements and their children.
- Any attributes whose name starts with `aria-` or `data-i`.
- `xmlns` attributes are never removed.
- Attribues with a namespace prefix are never removed unless the prefix is `xml` or `xlink`.

Elements are removed if:

- They are not allowed as children of their parents.

Attributes set to a default value are removed if:

- They are not overriding a value set by an ancestor, and
- they are not in an element that has an id (e.g., a `linearGradient` or similar element which may be referenced elsewhere)
- they are not in an element which is referenced by a `<use>` element (or a child of any such element).
