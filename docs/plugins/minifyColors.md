# minifyColors

Rewrites color attributes and properties to use shorter formats.

## Details

The plugin has no effect if:

- The document has scripts.
- The document has `<style>` elements with CSS which **svgo-ll** is not able to process.
- The `<style>` has attribute selectors.

Depending on the format of the color specification, the color may be shortened as follows:

- RGB colors in hexadecimal notation and [extended color keywords](https://www.w3.org/TR/css-color-3/#svg-color) are shortened to the shortest possible string (which may be a 6 character or 3 character hex string, or an extended color keyword).
- RGB colors in `rgb()` functional notation using integer values are converted to 6 digit hexadecimal format, then shortened as above.
- RGB colors in `rgb()` functional notation with percentage values, all of which are either `0%` or `100%`, are changed to integer values of 0 or 255, then shortened as above.
- Color values in formats other than those described above are not changed.
