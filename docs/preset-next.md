`preset-next` is the set of plugins that will become the [defaults](./preset-default.md) in version 6. To enable these plugins, use the
`--preset=next` option on the [command line](./command-line-options.md).

## Plugins List

The following plugins are included in `preset-next`, in the order that they are executed:

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
- [minifyColors](./plugins/minifyColors.md)
- [minifyGradients](./plugins/minifyGradients.md)
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
- [removeEmptyContainers](./plugins/removeEmptyContainers.md)
- removeUnusedNS
- [createGroups](./plugins/createGroups.md)
- [cleanupTextElements](./plugins/cleanupTextElements.md)
