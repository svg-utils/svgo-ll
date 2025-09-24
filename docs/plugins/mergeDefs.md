# mergeDefs

Merges the content of multiple `<defs>` elements into a single element.

## Details

The plugin has no effect if:

- The document has scripts.

If there is more than one `<defs>` element, the children of all subsequent `<defs>` elements are moved into the first element, and the subsequent `<defs>` elements are deleted.
