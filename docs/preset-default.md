**svgo-ll** runs with a default preset that has the plugin ID `preset-default`. This is the default set of plugins that are used when not explicitly specified or overridden elsewhere.

## Plugins List

The following plugins are included in `preset-default`, in the order that they are executed:

- removeDoctype
- removeXMLProcInst
- removeComments
- removeMetadata
- removeEditorsNSData
- removeDesc
- [cleanupXlink](./plugins/cleanupXlink.md)
- [cleanupStyleAttributes](./plugins/cleanupStyleAttributes.md)
- combineStyleElements
- [inlineStyles](./plugins/inlineStyles.md)
- minifyStyles
- [cleanupIds](./plugins/cleanupIds.md)
- convertColors
- [removeUnknownsAndDefaults](./plugins/removeUnknownsAndDefaults.md)
- removeNonInheritableGroupAttrs
- removeUselessStrokeAndFill
- [removeHiddenElems](./plugins/removeHiddenElems.md)
- removeEmptyText
- minifyTransforms
- convertEllipseToCircle
- moveElemsStylesToGroup
- collapseGroups
- convertShapeToPath
- [minifyPathData](./plugins/minifyPathData.md)
- removeEmptyContainers
- removeUnusedNS
- [createGroups](./plugins/createGroups.md)

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
