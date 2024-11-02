import { CSSTransformValue } from './css-parse-decl.js';
import { ExactNum } from './exactnum.js';
import { SVGTransformValue } from './svg-parse-att.js';

/**
 * @param {import('./types.js').CSSPropertyValue|undefined} cssValue
 * @returns {import('./types.js').SVGAttValue|undefined}
 */
export function cssTransformToSVGAtt(cssValue) {
  if (!cssValue) {
    return;
  }
  const cssTransformValue = CSSTransformValue.getTransformObj(cssValue.value);
  const cssTransforms = cssTransformValue.getTransforms();
  if (cssTransforms === null) {
    return;
  }
  /** @type {import('./types-svg-attr.js').SVGTransformFn[]} */
  const svgTransforms = [];
  for (let index = 0; index < cssTransforms.length; index++) {
    const t = cssTransforms[index];
    switch (t.name) {
      case 'matrix':
        svgTransforms.push({
          name: 'matrix',
          a: t.a.clone(),
          b: t.b.clone(),
          c: t.c.clone(),
          d: t.d.clone(),
          e: t.e.clone(),
          f: t.f.clone(),
        });
        break;
      case 'rotate':
        if (t.a.unit !== 'deg') {
          return;
        }
        svgTransforms.push({
          name: 'rotate',
          a: t.a.n.clone(),
          tx: ExactNum.zero(),
          ty: ExactNum.zero(),
        });
        break;
      case 'scale':
        svgTransforms.push({
          name: 'scale',
          sx: t.sx.clone(),
          sy: t.sy.clone(),
        });
        break;
      case 'skewX':
      case 'skewY':
        if (t.a.unit !== 'deg') {
          return;
        }
        svgTransforms.push({
          name: t.name,
          a: t.a.n.clone(),
        });
        break;
      case 'translate':
        {
          if (t.x.unit !== 'px' || t.y.unit !== 'px') {
            return;
          }
          const x = t.x.n.clone();
          const y = t.y.n.clone();
          // See if it can be converted to rotate(a tx ty).
          if (index < cssTransforms.length - 2) {
            if (cssTransforms[index + 1].name === 'rotate') {
              const t2 = cssTransforms[index + 2];
              if (t2.name === 'translate') {
                if (t2.x.unit !== 'px' || t2.y.unit !== 'px') {
                  return;
                }
                if (
                  t2.x.n.negate().isEqualTo(x) &&
                  t2.y.n.negate().isEqualTo(y)
                ) {
                  svgTransforms.push({
                    name: 'rotate',
                    // @ts-ignore - 'rotate' checked above.
                    a: cssTransforms[index + 1].a.n.clone(),
                    tx: x,
                    ty: y,
                  });
                  index += 2;
                  continue;
                }
              }
            }
          }
          svgTransforms.push({
            name: 'translate',
            x: x,
            y: y,
          });
        }
        break;
      default:
        return;
    }
  }
  return new SVGTransformValue(undefined, svgTransforms);
}

/**
 * @param {import('./types.js').SVGAttValue} attValue
 * @returns {import('./types.js').CSSPropertyValue|undefined}
 */
export function svgAttTransformToCSS(attValue) {
  const svgTransforms = SVGTransformValue.getTransformObj(attValue);
  /** @type {import('./types-css-decl.js').CSSTransformFn[]} */
  const cssTransforms = [];
  for (const t of svgTransforms.getTransforms()) {
    switch (t.name) {
      case 'matrix':
        cssTransforms.push({
          name: 'matrix',
          a: t.a.clone(),
          b: t.b.clone(),
          c: t.c.clone(),
          d: t.d.clone(),
          e: t.e.clone(),
          f: t.f.clone(),
        });
        break;
      case 'rotate':
        {
          /** @type {import('./types-css-decl.js').CSSTransFnRotate} */
          const rotate = {
            name: 'rotate',
            a: { n: t.a.clone(), unit: 'deg' },
          };
          if (t.tx.isZero() && t.ty.isZero()) {
            cssTransforms.push(rotate);
          } else {
            cssTransforms.push(makeCSSTranslate(t.tx, t.ty));
            cssTransforms.push(rotate);
            cssTransforms.push(makeCSSTranslate(t.tx.negate(), t.ty.negate()));
          }
        }
        break;
      case 'scale':
        cssTransforms.push({
          name: t.name,
          sx: t.sx.clone(),
          sy: t.sy.clone(),
        });
        break;
      case 'skewX':
      case 'skewY':
        cssTransforms.push({
          name: t.name,
          a: { n: t.a.clone(), unit: 'deg' },
        });
        break;
      case 'translate':
        cssTransforms.push(makeCSSTranslate(t.x, t.y));
        break;
      default:
        throw new Error();
    }
  }
  return {
    value: new CSSTransformValue(undefined, cssTransforms),
    important: false,
  };
}

/**
 * @param {import('./types.js').ExactNum} tx
 * @param {import('./types.js').ExactNum} ty
 * @returns {import('./types-css-decl.js').CSSTransFnTranslate}
 */
function makeCSSTranslate(tx, ty) {
  return {
    name: 'translate',
    x: { n: tx.clone(), unit: 'px' },
    y: { n: ty.clone(), unit: 'px' },
  };
}
