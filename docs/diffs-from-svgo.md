# Differences Between **svgo-ll** and SVGO version 4

**svgo-ll** originated as a clone of an [SVGO](https://github.com/svg/svgo) version 4 release candidate. Since then, numerous changes have been made to prioritize lossless compression, fix bugs, and improve performance. Some of these changes are discussed below.

## Rounding and Precision

In SVGO, rounding of decimal values is enabled by default and integrated into many plugins in ways that are not possible to disable. In **svgo-ll**, default plugins do not do any rounding. Rounding is opt-in and handled by a [separate plugin](./plugins/round.md).

## Plugins

The following SVGO default plugins have been removed from **svgo-ll**:

- **cleanupAttrs**
- **cleanupEnableBackground**
- **cleanupNumericValues**
- **convertColors** - similar functionality is in the new **[minifyColors](./plugins/minifyColors.md)** plugin
- **convertPathData** - most of the lossless functionality of this plugin has been preserved in the new **[minifyPathData](./plugins/minifyPathData.md)** plugin
- **convertTransform** - some of the benefits of this plugin are achieved with the new **[minifyTransforms](./plugins/minifyTransforms.md)** plugin
- **mergePaths** - some of the benefits of **mergePaths** are achieved with the new **[createGroups](./plugins/createGroups.md)** plugin
- **mergeStyles**
- **moveElemsAttrsToGroup**
- **moveGroupAttrsToElems**
- **removeDeprecatedAttrs**
- **removeEmptyAttrs**
- **removeEmptyText** - now handled by [removeEmptyContainers](./plugins/removeEmptyContainers.md)
- **sortAttrs**
- **sortDefsChildren**

The following new default plugins have been added to **svgo-ll**:

- **[cleanupStyleAttributes](./plugins/cleanupStyleAttributes.md)**
- **[cleanupTextElements](./plugins/cleanupTextElements.md)**
- **[cleanupXlink](./plugins/cleanupXlink.md)**
- **combineStyleElements**
- **[createGroups](./plugins/createGroups.md)**
- **[mergeGradients](./plugins/mergeGradients.md)**
- **[minifyColors](./plugins/minifyColors.md)**
- **[minifyGradients](./plugins/minifyGradients.md)**
- **[minifyPathData](./plugins/minifyPathData.md)**
- **[minifyTransforms](./plugins/minifyTransforms.md)**
- **moveElemsStylesToGroup**

## CSS

In SVGO, many plugins do not account for the impact of CSS. Many transformations are not safe when styles are used; when `<style>` elements are present, it can be difficult to determine whether a transformation is safe. All **svgo-ll** plugins check for the presence of `<style>` elements and the types of selectors they use; depending on whether `<style>` elements are present and the complexity of selectors, they may disable all or part of their functionality. For more details, see the [scalability](#scalability) section.

## Configuration

Plugins can be [enabled, disabled, and configured](./command-line-options.md#plugins) from the command line without writing code.

The `--multipass` option has been deprecated and replaced by [`--max-passes`](./command-line-options.md#max-passes). By default **svgo-ll** will make up to 10 passes, the equivalent of using the `--multipass` option in SVGO.

<a id="scalability"></a>

## Scalability

A number of architectural changes have been made to improve performance and scalability. These include:

- Deprecating `detachNodeFromParent()` - see discussion in SVGO issues [1969](https://github.com/svg/svgo/issues/1969) and [2080](https://github.com/svg/svgo/issues/2080).
- Recording data which is expensive to calculate outside of the optimization loop (particularly `<style>` data) and passing this data to each plugin. Plugins which modify the data (e.g. `inlineStyles`) are responsible for updating the data.
