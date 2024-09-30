`preset-next` is the set of plugins that will become the [defaults](./preset-default.md) in version 6. To enable these plugins, use the
`--preset=next` option on the command line.

## Plugins List

The following plugins are included in `preset-next`, in the order that they're executed:

- removeDoctype
- removeXMLProcInst
- removeComments
- removeMetadata
- removeEditorsNSData
- removeDesc
- cleanupAttrs
- [cleanupXlink](./plugins/cleanupXlink.md)
- cleanupStyleAttributes
- combineStyleElements
- [inlineStyles](./plugins/inlineStyles.md)
- minifyStyles
- [cleanupIds](./plugins/cleanupIds.md)
- removeUselessDefs
- convertColors
- [removeUnknownsAndDefaults](./plugins/removeUnknownsAndDefaults.md)
- removeNonInheritableGroupAttrs
- removeUselessStrokeAndFill
- removeHiddenElems
- removeEmptyText
- minifyTransforms
- convertEllipseToCircle
- moveElemsAttrsToGroup
- moveElemsStylesToGroup
- collapseGroups
- convertShapeToPath
- combinePaths
- [minifyPathData](./plugins/minifyPathData.md)
- removeEmptyAttrs
- removeEmptyContainers
- removeUnusedNS

## Disable a Plugin

Sometimes a specific plugin might not be appropriate for your workflow. You can continue using `preset-default` while disabling any plugin by using the `overrides` parameter.

In `overrides`, reference the plugin ID and set it to `false` to disable it:

```js
module.exports = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
        },
      },
    },
  ],
};
```

Alternatively, you can drop `preset-default` entirely, and configure your own plugin pipeline from scratch, with only the desirable plugins:

```js
module.exports = {
  plugins: [
    'removeDoctype',
    'removeXMLProcInst',
    'minifyStyles',
    'sortAttrs',
    'sortDefsChildren',
  ],
};
```
