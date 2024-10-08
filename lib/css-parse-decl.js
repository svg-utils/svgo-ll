/**
 * @param {string} str
 * @return {import('./types-css-decl.js').CSSTransformFn[]|null}
 * @see https://drafts.csswg.org/css-transforms/#typedef-transform-function
 */
export function parseCSSTransform(str) {
  /** @type {import('./types-css-decl.js').CSSTransformFn[]} */
  const transforms = [];
  const fns = str.split(')');
  for (const fn of fns) {
    if (fn.trim() === '') {
      continue;
    }
    const parts = fn.split('(');
    if (parts.length !== 2) {
      return null;
    }
    const name = parts[0].trim();
    const strArgs = parts[1].trim();
    const args = strArgs.split(',').map((a) => a.trim());
    switch (name) {
      case 'rotate':
        {
          if (args.length !== 1) {
            return null;
          }
          const angle = parseAngle(args[0]);
          if (angle === null) {
            return null;
          }
          transforms.push({ name: 'rotate', a: angle });
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
export function stringifyCSSTransform(transforms) {
  /**
   * @param {import('./types-css-decl.js').CSSTransformFn} transform
   */
  function stringify(transform) {
    switch (transform.name) {
      case 'rotate':
        return `rotate(${transform.a.n}${transform.a.unit})`;
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
 * @param {string} str
 * @returns {import('./types-css-decl.js').CSSTypeAngle|null}
 */
function parseAngle(str) {
  if (str === '0') {
    return { n: 0, unit: 'deg' };
  }
  const unitLen = str.endsWith('deg') || str.endsWith('rad') ? 3 : 4;
  const strN = str.substring(0, str.length - unitLen);
  const unit = str.substring(str.length - unitLen);
  if (unit != 'deg' && unit != 'grad' && unit != 'rad' && unit != 'turn') {
    return null;
  }
  const n = parseFloat(strN);
  if (isNaN(n)) {
    return null;
  }
  return { n: n, unit: unit };
}
