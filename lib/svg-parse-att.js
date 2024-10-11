import { transform2js } from '../plugins/_transforms.js';
import { CSSTransformValue } from './css-parse-decl.js';
import { AttValue } from './attvalue.js';
import { ExactNum } from './exactnum.js';

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
 * @param {string} str
 * @returns {import('./types-svg-attr.js').SVGTransformFn[]}
 */
export function svgParseTransform(str) {
  const genericTransforms = transform2js(str);
  /** @type {import('./types-svg-attr.js').SVGTransformFn[]} */
  const transforms = [];
  for (const t of genericTransforms) {
    switch (t.name) {
      case 'matrix':
        transforms.push({
          name: 'matrix',
          a: new ExactNum(t.data[0]),
          b: new ExactNum(t.data[1]),
          c: new ExactNum(t.data[2]),
          d: new ExactNum(t.data[3]),
          e: new ExactNum(t.data[4]),
          f: new ExactNum(t.data[5]),
        });
        break;
      case 'rotate':
        {
          const tx = new ExactNum(t.data.length === 3 ? t.data[1] : 0);
          const ty = new ExactNum(t.data.length === 3 ? t.data[2] : 0);
          transforms.push({
            name: 'rotate',
            a: new ExactNum(t.data[0]),
            tx: tx,
            ty: ty,
          });
        }
        break;
      case 'scale':
        {
          const sy = new ExactNum(t.data.length === 2 ? t.data[1] : t.data[0]);
          transforms.push({
            name: 'scale',
            sx: new ExactNum(t.data[0]),
            sy: sy,
          });
        }
        break;
      case 'skewX':
      case 'skewY':
        transforms.push({ name: t.name, a: new ExactNum(t.data[0]) });
        break;
      case 'translate':
        {
          const y = new ExactNum(t.data.length === 2 ? t.data[1] : 0);
          transforms.push({
            name: 'translate',
            x: new ExactNum(t.data[0]),
            y: y,
          });
        }
        break;
      default:
        throw new Error();
    }
  }
  return transforms;
}

/**
 *
 * @param {import('./types.js').XastElement} element
 * @param {string} attName
 * @param {import('./types.js').SVGAttValue} attValue
 */
export function svgSetAttValue(element, attName, attValue) {
  element.attributes[attName] = attValue.toString();
}

/**
 * @param {import('./types-svg-attr.js').SVGTransformFn[]} transforms
 * @returns {string}
 */
export function svgStringifyTransform(transforms) {
  /**
   * @param {import('./types-svg-attr.js').SVGTransformFn} transform
   */
  function stringify(transform) {
    switch (transform.name) {
      case 'matrix':
        return `matrix(${transform.a.getMinifiedString()} ${transform.b.getMinifiedString()} ${transform.c.getMinifiedString()} ${transform.d.getMinifiedString()} ${transform.e.getMinifiedString()} ${transform.f.getMinifiedString()})`;
      case 'rotate':
        if (transform.tx.isZero() && transform.ty.isZero()) {
          return `rotate(${transform.a.getMinifiedString()})`;
        }
        return `rotate(${transform.a.getMinifiedString()} ${transform.tx.getMinifiedString()} ${transform.ty.getMinifiedString()})`;
      case 'scale':
        if (
          transform.sx.getMinifiedString() === transform.sy.getMinifiedString()
        ) {
          return `scale(${transform.sx.getMinifiedString()})`;
        } else {
          return `scale(${transform.sx.getMinifiedString()} ${transform.sy.getMinifiedString()})`;
        }
      case 'skewX':
      case 'skewY':
        return `${transform.name}(${transform.a.getMinifiedString()})`;
      case 'translate':
        if (transform.y.isZero()) {
          return `translate(${transform.x.getMinifiedString()})`;
        } else {
          return `translate(${transform.x.getMinifiedString()} ${transform.y.getMinifiedString()})`;
        }
      default:
        throw new Error();
    }
  }
  return transforms.reduce(
    (str, transform) => (str += stringify(transform)),
    '',
  );
}

export class SVGTransformValue extends AttValue {
  /** @type {import("./types-svg-attr.js").SVGTransformFn[]|undefined} */
  #transforms;

  /**
   *
   * @param {string|undefined} strVal
   * @param {import("./types-svg-attr.js").SVGTransformFn[]} [transforms]
   */
  constructor(strVal, transforms) {
    super(strVal);
    this.#transforms = transforms;
  }

  generateString() {
    if (!this.#transforms) {
      throw new Error();
    }
    return svgStringifyTransform(this.#transforms);
  }

  /**
   * @param {string|AttValue} value
   * @returns {SVGTransformValue}
   */
  static getTransformObj(value) {
    if (typeof value === 'string') {
      return new SVGTransformValue(value);
    }
    if (value instanceof SVGTransformValue) {
      return value;
    }
    throw value;
  }

  /**
   * @returns {import("./types-svg-attr.js").SVGTransformFn[]}
   */
  getTransforms() {
    if (this.#transforms === undefined) {
      this.#transforms = svgParseTransform(this.toString());
    }
    return this.#transforms;
  }
}

/**
 * @param {ExactNum} tx
 * @param {ExactNum} ty
 * @returns {import('./types-css-decl.js').CSSTransFnTranslate}
 */
function makeCSSTranslate(tx, ty) {
  return {
    name: 'translate',
    x: { n: tx.clone(), unit: 'px' },
    y: { n: ty.clone(), unit: 'px' },
  };
}
