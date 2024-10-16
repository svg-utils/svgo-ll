# round

Rounds numbers to a shorter form.

## Options

- `coordDigits`: **number** - the number of digits after the decimal place to round x/y coordinates and width/height values (default: **4**)
- `opacityDigits`: **number** - the number of digits after the decimal place to round opacity values (default: **3**)

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The document has `<style>` elements with attribute selectors.

### x and y coordinates and width/height

Coordinate values and lengths are rounded according to the context in which they are used. The number of digits to which a value is rounded is based on the `viewBox` context in which it is used (or if there is no `viewBox`, the `width` and `height`). The number of digits specified by the `coordDigits` parameter specifies the number of digits for a dimension >= 100 pixels and < 1000 pixels. Smaller dimensions will add one digit for each factor of 10, and larger dimensions will subtract one digit for each factor of 10.

The following values are rounded using this value:

- `M`, `m`, `L`, `l`, `H`, `h`, `V`, or `v` command values in the `d` attribute of a path element.
- The coordinates in a `translate()` function in a `transform` attribute.
- The `x`, `y`, `width` and `height` attributes of a `<rect>` element.
- The `x1`, `y1`, `x2` and `y2` attributes of a `<line>` element.

If the dimension of the element or its ancestors cannot be determined, or if the element or one of its ancestors is subject to a `transform` other than `translate()`, no rounding is done.

### Opacities

`opacity` and `fill-opacity` values are rounded to the number of digits specified by the `opacityDigits` parameter.

### Colors

Any colors specified using RGB percentages are converted to integer RGB values, and minified as they are in the [minifyColors](./minifyColors.md) plugin.
