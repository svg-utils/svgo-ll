`preset-next` is the set of plugins that will become the [defaults](./preset-default.md) in version 6. To enable these plugins, use the
`--preset=next` option on the [command line](./command-line-options.md).

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
