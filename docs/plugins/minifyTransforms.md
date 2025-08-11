# minifyTransforms

Make transform expressions as short as possible.

## Details

For all `transform`, `gradientTransform`, `patternTransform` attributes, rewrite them in a shorter form if possible.

The following transformations are performed:

- All numbers in the transform expressions are written in the most compact form.
- Default values are removed (e.g., `translate(2,0)` becomes `translate(2)`).
- If equivalent expressions are possible, the shortest one is used (e.g., `matrix(1 0 0 1 10 20)` becomes `translate(10 20)`).
- Adjacent `translate()` functions are merged (e.g., `translate(2 3)translate(4)` becomes `translate(6 3)`).
- Adjacent `scale()` functions are merged (e.g., `scale(2.1)scale(2.2)` becomes `scale(4.62)`).
- Adjacent `rotate()` functions are merged (e.g., `rotate(23)rotate(24)` becomes `rotate(47)`).
- Attributes with meaningless transforms are removed (e.g., `transform="rotate(0)"`).
