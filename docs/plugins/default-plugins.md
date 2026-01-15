# Default Plugins

The following plugins are enabled by default.

<a id="pre"></a>

## Preprocessing

Run once, in the specified order, before running any other plugins:

- [cleanupTextNodes](./cleanupTextNodes.md)
- removeDoctype
- removeXMLProcInst
- removeComments
- removeMetadata
- removeEditorsNSData
- removeDesc
- [cleanupXlink](./cleanupXlink.md)
- combineStyleElements
- [cleanupAttributes](./cleanupAttributes.md)

<a id="main"></a>

## Main Plugins

Run until there are no further decreases in size, up to [max-passes](../command-line-options.md#max-passes) times, in the following order:

- [inlineStyles](./inlineStyles.md)
- minifyStyles
- [minifyColors](./minifyColors.md)
- [removeUnknownsAndDefaults](./removeUnknownsAndDefaults.md)
- removeNonInheritableGroupAttrs
- [removeUselessProperties](./removeUselessProperties.md)
- [removeUnusedElements](./removeUnusedElements.md)
- [removeUselessStrokeAndFill](./removeUselessStrokeAndFill.md)
- convertEllipseToCircle
- moveElemsStylesToGroup
- cleanupGradientAttributes
- [convertShapeToPath](./convertShapeToPath.md)
- [minifyPathData](./minifyPathData.md)
- [mergeFilters](./mergeFilters.md)
- [mergeGradients](./mergeGradients.md)
- [minifyGradients](./minifyGradients.md)
- minifyPatterns
- [removeEmptyContainers](./removeEmptyContainers.md)
- [convertPathToUse](./convertPathToUse.md)
- [createGroups](./createGroups.md)
- collapseGroups
- [cleanupTextElements](./cleanupTextElements.md)

<a id="post"></a>

## Postprocessing

Run once, in the specified order, after main plugins have completed:

- removeUnusedNS
- convertImageToUse
- moveGradientAttsToTemplate
- [minifyIds](./minifyIds.md)
- [minifyAttrsAndStyles](./minifyAttrsAndStyles.md)
- [stylesToClasses](./stylesToClasses.md)
- [minifyClassNames](./minifyClassNames.md)
