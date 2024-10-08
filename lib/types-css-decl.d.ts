export type CSSTypeAngle = { n: number; unit: 'deg' | 'grad' | 'rad' | 'turn' };

export type CSSTransFnRotate = { name: 'rotate'; a: CSSTypeAngle };

export type CSSTransformFn = CSSTransFnRotate;
