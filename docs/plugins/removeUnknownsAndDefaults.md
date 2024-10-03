# removeUnknownsAndDefaults

Removes unknown elements and attributes, as well as attributes that are set to their default value.
It also removes the the `standalone` declaration from the DTD if [`standalone`](https://www.w3.org/TR/REC-xml/#sec-rmd) is set to `no`.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.

The following elements and attributes are not processed:

- Any element with a namespace prefix.
- Any `<foreignObject>` elements and their children.
- Any attributes whose name starts with `aria-` or `data-i`.
- `xmlns` attributes are never removed.
- Attributes with a namespace prefix are never removed unless the prefix is `xml` or `xlink`.

### Elements

Elements are removed if:

- They are not allowed as children of their parents.

### `style` attributes

Style attribute properties are removed if they are not in an element which is referenced by a `<use>` element (or are a child of any such element), and removing the property does not change the effective style on the element.

### Other attributes

Attributes are always removed if there is a `style` attribute property which overrides the attribute.

Attributes are removed if they are not valid for the element.

Otherwise attributes are removed if both:

- They are either

  - not inheritable, and are set to a default value, or
  - inheritable, and either have the same value as the parent element, or have a default value, and are not overriding the value of the parent element

  and

- they are not in an element which is referenced by a `<use>` element (or are a child of any such element).
