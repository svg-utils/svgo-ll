# Default Plugins

The following plugins are enabled by default.

<a id="pre"></a>

## Preprocessing

Run once, in the specified order, before running any other plugins:

- removeDoctype
- removeXMLProcInst
- removeComments
- removeMetadata
- removeEditorsNSData
- removeDesc
- [cleanupXlink](./cleanupXlink.md)
- combineStyleElements

<a id="main"></a>

## Main Plugins

Run until there are no further decreases in size, up to [max-passes](../command-line-options.md#max-passes) times, in the following order:

- [cleanupStyleAttributes](./cleanupStyleAttributes.md)
- [inlineStyles](./inlineStyles.md)
- minifyStyles
- [cleanupIds](./cleanupIds.md)
- [minifyColors](./minifyColors.md)
- [minifyGradients](./minifyGradients.md)
- [removeUnknownsAndDefaults](./removeUnknownsAndDefaults.md)
- removeNonInheritableGroupAttrs
- [removeUselessStrokeAndFill](./removeUselessStrokeAndFill.md)
- [removeHiddenElems](./removeHiddenElems.md)
- [mergeDefs](./mergeDefs.md)
- [minifyTransforms](./minifyTransforms.md)
- convertEllipseToCircle
- moveElemsStylesToGroup
- [convertShapeToPath](./convertShapeToPath.md)
- [minifyPathData](./minifyPathData.md)
- [mergeGradients](./mergeGradients.md)
- [removeEmptyContainers](./removeEmptyContainers.md)
- [createGroups](./createGroups.md)
- collapseGroups
- [cleanupTextElements](./cleanupTextElements.md)

<a id="post"></a>

## Postprocessing

Run once, in the specified order, after main plugins have completed:

- removeUnusedNS
- [minifyIds](./minifyIds.md)
- [minifyAttrsAndStyles](./minifyAttrsAndStyles.md)
- [stylesToClasses](./stylesToClasses.md)
- [minifyClassNames](./minifyClassNames.md)
