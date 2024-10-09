import type { ExactNum } from './exactnum.js';

export type SVGTransFnMatrix = {
  name: 'matrix';
  a: ExactNum;
  b: ExactNum;
  c: ExactNum;
  d: ExactNum;
  e: ExactNum;
  f: ExactNum;
};
export type SVGTransFnRotate = {
  name: 'rotate';
  a: ExactNum;
  tx: ExactNum;
  ty: ExactNum;
};
export type SVGTransFnScale = {
  name: 'scale';
  sx: ExactNum;
  sy: ExactNum;
};
export type SVGTransFnSkewX = { name: 'skewX'; a: ExactNum };
export type SVGTransFnSkewY = { name: 'skewY'; a: ExactNum };
export type SVGTransFnTranslate = {
  name: 'translate';
  x: ExactNum;
  y: ExactNum;
};

export type SVGTransformFn =
  | SVGTransFnMatrix
  | SVGTransFnRotate
  | SVGTransFnScale
  | SVGTransFnSkewX
  | SVGTransFnSkewY
  | SVGTransFnTranslate;
