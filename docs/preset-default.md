**svgo-ll** runs with a default preset that has the plugin ID `preset-default`. This is the default set of plugins that are used when not explicitly specified or overridden elsewhere. In addition to the default plugins, there are some [builtin plugins](./builtin-plugins.md) that must be enabled explicitly.

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
