import type { ExactNum } from './exactnum.js';

export type CSSTypeAngle = {
  n: ExactNum;
  unit: 'deg' | 'grad' | 'rad' | 'turn';
};
export type CSSTypeLength = { n: ExactNum; unit: 'px' };

export type CSSTransFnMatrix = {
  name: 'matrix';
  a: ExactNum;
  b: ExactNum;
  c: ExactNum;
  d: ExactNum;
  e: ExactNum;
  f: ExactNum;
};
export type CSSTransFnRotate = { name: 'rotate'; a: CSSTypeAngle };
export type CSSTransFnScale = {
  name: 'scale';
  sx: ExactNum;
  sy: ExactNum;
};
export type CSSTransFnSkewX = { name: 'skewX'; a: CSSTypeAngle };
export type CSSTransFnSkewY = { name: 'skewY'; a: CSSTypeAngle };
export type CSSTransFnTranslate = {
  name: 'translate';
  x: CSSTypeLength;
  y: CSSTypeLength;
};

export type CSSTransformFn =
  | CSSTransFnMatrix
  | CSSTransFnRotate
  | CSSTransFnScale
  | CSSTransFnSkewX
  | CSSTransFnSkewY
  | CSSTransFnTranslate;
