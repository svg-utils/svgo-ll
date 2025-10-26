import { ExactNum } from '../types/types.js';

export type TransTypeAngleUnit = 'deg' | 'grad' | 'rad' | 'turn';
export type TransTypeAngle = {
  n: ExactNum;
  unit: TransTypeAngleUnit;
};
export type TransTypeLength = {
  n: ExactNum;
  unit: 'px' | 'cm' | 'em' | 'mm' | 'Q' | 'in' | 'pc' | 'pt';
};

export type TransformFnMatrix = {
  name: 'matrix';
  a: ExactNum;
  b: ExactNum;
  c: ExactNum;
  d: ExactNum;
  e: ExactNum;
  f: ExactNum;
};
export type TransformFnRotate = {
  name: 'rotate';
  a: TransTypeAngle;
};
export type TransformFnScale = {
  name: 'scale';
  sx: ExactNum;
  sy: ExactNum;
};
export type TransformFnSkewX = { name: 'skewX'; a: TransTypeAngle };
export type TransformFnSkewY = { name: 'skewY'; a: TransTypeAngle };
export type TransformFnTranslate = {
  name: 'translate';
  x: TransTypeLength;
  y: TransTypeLength;
};

export type TransformFn =
  | TransformFnMatrix
  | TransformFnRotate
  | TransformFnScale
  | TransformFnSkewX
  | TransformFnSkewY
  | TransformFnTranslate;
