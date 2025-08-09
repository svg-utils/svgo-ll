# Differences Between **svgo-ll** and SVGO version 4

**svgo-ll** originated as a clone of an [SVGO](https://github.com/svg/svgo) version 4 release candidate. Since then, numerous changes have been made to prioritize lossless compression, fix bugs, and improve performance.

## Rounding and Precision

In SVGO, rounding of decimal values is enabled by default and integrated into many plugins in ways that are not possible to disable. In **svgo-ll**, default plugins do not do any rounding. Rounding is opt-in and handled by a [separate plugin](./plugins/round.md).

## Plugins

The following SVGO plugins have been removed from **svgo-ll**:

- **cleanupAttrs**
- **cleanupEnableBackground**
- **cleanupNumericValues**
- **convertColors** - similar functionality is in the new **[minifyColors](./plugins/minifyColors.md)** plugin
- **convertPathData** - most of the lossless functionality of this plugin has been preserved in the new **[minifyPathData](./plugins/minifyPathData.md)** plugin
- **convertTransform**
- **mergePaths** - some of the benefits of **mergePaths** are achieved with the new **[createGroups](./plugins/createGroups.md)** plugin
- **mergeStyles**
- **moveElemsAttrsToGroup**
- **moveGroupAttrsToElems**
- **removeDeprecatedAttrs**
- **removeEmptyAttrs**
- **removeEmptyText**
- **sortAttrs**
- **sortDefsChildren**

The following new plugins have been added to **svgo-ll**:

- **[cleanupStyleAttributes](./plugins/cleanupStyleAttributes.md)**
- **[cleanupTextElements](./plugins/cleanupTextElements.md)**
- **[cleanupXlink](./plugins/cleanupXlink.md)**
- **combineStyleElements**
- **[createGroups](./plugins/createGroups.md)**
- **mergeGradients**
- **[minifyColors](./plugins/minifyColors.md)**
- **[minifyGradients](./plugins/minifyGradients.md)**
- **[minifyPathData](./plugins/minifyPathData.md)**
- **minifyTransforms**
- **moveElemsStylesToGroup**

## CSS

## Scalability

caching, list of issues
