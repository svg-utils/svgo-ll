import { ExactNum } from './exactnum.js';

/**
 * @param {import('./types.js').CSSPropertyValue} propVal
 * @returns {import('./types-css-decl.js').CSSTransformFn[]|null}
 */
export function cssGetTransform(propVal) {
  if (propVal.parsedValue === undefined) {
    propVal.parsedValue = {
      type: 'transform',
      value: cssParseTransform(propVal.value),
    };
  }
  return propVal.parsedValue.value;
}

/**
 * @param {string} str
 * @return {import('./types-css-decl.js').CSSTransformFn[]|null}
 * @see https://drafts.csswg.org/css-transforms/#typedef-transform-function
 */
export function cssParseTransform(str) {
  /** @type {import('./types-css-decl.js').CSSTransformFn[]} */
  const transforms = [];
  const fns = str.split(')');
  for (let index = 0; index < fns.length - 1; index++) {
    const fn = fns[index];
    const parts = fn.split('(');
    if (parts.length !== 2) {
      return null;
    }
    const name = parts[0].trim();
    const strArgs = parts[1].trim();
    const args = strArgs.split(',').map((a) => a.trim());
    switch (name) {
      case 'matrix':
        if (args.length !== 6) {
          return null;
        }
        transforms.push({
          name: 'matrix',
          a: new ExactNum(args[0]),
          b: new ExactNum(args[1]),
          c: new ExactNum(args[2]),
          d: new ExactNum(args[3]),
          e: new ExactNum(args[4]),
          f: new ExactNum(args[5]),
        });
        break;
      case 'rotate':
      case 'skewX':
      case 'skewY':
        {
          if (args.length !== 1) {
            return null;
          }
          const angle = parseAngle(args[0]);
          if (angle === null) {
            return null;
          }
          transforms.push({ name: name, a: angle });
        }
        break;
      case 'scale':
        {
          switch (args.length) {
            case 1:
              break;
            case 2:
              if (args[1].endsWith('%')) {
                return null;
              }
              break;
            default:
              return null;
          }
          const sy = args.length === 2 ? args[1] : args[0];
          transforms.push({
            name: 'scale',
            sx: new ExactNum(args[0]),
            sy: new ExactNum(sy),
          });
        }
        break;
      case 'translate':
        switch (args.length) {
          case 1:
          case 2:
            {
              const x = parseLength(args[0]);
              /** @type {import('./types-css-decl.js').CSSTypeLength|null} */
              const y =
                args.length == 2
                  ? parseLength(args[1])
                  : { n: ExactNum.zero(), unit: 'px' };
              if (x === null || y === null) {
                return null;
              }
              transforms.push({ name: 'translate', x: x, y: y });
            }
            break;
          default:
            return null;
        }
        break;
      default:
        return null;
    }
  }
  return transforms;
}

/**
 * @param {import('./types-css-decl.js').CSSTransformFn[]} transforms
 * @returns {string}
 */
export function cssStringifyTransform(transforms) {
  /**
   * @param {import('./types-css-decl.js').CSSTransformFn} transform
   */
  function stringify(transform) {
    switch (transform.name) {
      case 'matrix':
        return `matrix(${transform.a.getMinifiedString()},${transform.b.getMinifiedString()},${transform.c.getMinifiedString()},${transform.d.getMinifiedString()},${transform.e.getMinifiedString()},${transform.f.getMinifiedString()})`;
      case 'rotate':
      case 'skewX':
      case 'skewY':
        return `${transform.name}(${transform.a.n.getMinifiedString()}${transform.a.unit})`;
      case 'scale': {
        const sx = transform.sx.getMinifiedString();
        const sy = transform.sy.getMinifiedString();
        if (sx === sy) {
          return `scale(${sx})`;
        }
        return `scale(${sx},${sy})`;
      }
      case 'translate':
        if (transform.y.n.isZero()) {
          return `translate(${transform.x.n.getMinifiedString()}${transform.x.unit})`;
        }
        return `translate(${transform.x.n.getMinifiedString()}${transform.x.unit},${transform.y.n.getMinifiedString()}${transform.y.unit})`;
      default:
        throw new Error();
    }
  }
  return transforms.reduce(
    (str, transform) => (str += stringify(transform)),
    '',
  );
}

/**
 * @param {import('./types.js').CSSPropertyValue|undefined} cssValue
 * @returns {import('./types.js').SVGAttValue|undefined}
 */
export function cssTransformToSVGAtt(cssValue) {
  if (!cssValue) {
    return;
  }
  const cssTransforms = cssGetTransform(cssValue);
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
  return { parsedVal: { type: 'transform', value: svgTransforms } };
}

/**
 * @param {string} str
 * @returns {import('./types-css-decl.js').CSSTypeAngle|null}
 */
function parseAngle(str) {
  if (str === '0') {
    return { n: ExactNum.zero(), unit: 'deg' };
  }
  const unitLen = str.endsWith('deg') || str.endsWith('rad') ? 3 : 4;
  const strN = str.substring(0, str.length - unitLen);
  const unit = str.substring(str.length - unitLen);
  if (unit != 'deg' && unit != 'grad' && unit != 'rad' && unit != 'turn') {
    return null;
  }
  return { n: new ExactNum(strN), unit: unit };
}

/**
 * @param {string} str
 * @returns {import('./types-css-decl.js').CSSTypeLength|null}
 */
function parseLength(str) {
  if (str === '0') {
    return { n: ExactNum.zero(), unit: 'px' };
  }
  if (!str.endsWith('px')) {
    return null;
  }
  const strN = str.substring(0, str.length - 2);
  return { n: new ExactNum(strN), unit: 'px' };
}
