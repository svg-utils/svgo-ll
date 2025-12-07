import { ExactNum } from './exactNum.js';
import { ExactPoint } from './exactPoint.js';

/**
 * @param {import('../types.js').XastElement} element
 * @returns {import('../../types/types.js').BoundingBox|undefined}
 */
export function getBoundingBox(element) {
  switch (element.local) {
    case 'path':
      return getBoundingBoxPath(element);
    case 'rect': {
      const x = getLenPctPixels(element, 'x');
      const y = getLenPctPixels(element, 'y');
      const width = getLenPctPixels(element, 'width');
      const height = getLenPctPixels(element, 'height');
      if (
        x === undefined ||
        y === undefined ||
        width === undefined ||
        height === undefined
      ) {
        return;
      }

      const x2 = x.add(width);
      const y2 = y.add(height);
      if (x2 === undefined || y2 === undefined) {
        return;
      }

      return {
        x1: x,
        y1: y,
        x2: x2,
        y2: y2,
      };
    }
  }
}

/**
 * @param {import('../types.js').XastElement} element
 * @param {string} attName
 * @returns {ExactNum|undefined}
 */
export function getLenPctPixels(element, attName) {
  /** @type {import('../../types/types.js').LengthPercentageAttValue|undefined} */
  const att = element.svgAtts.get(attName);
  if (att === undefined) {
    return;
  }
  const px = att.getPixels();
  if (px === null) {
    return;
  }
  return new ExactNum(px);
}

// Internal functions

/**
 * @param {import('../types.js').XastElement} element
 * @returns {import('../../types/types.js').BoundingBox|undefined}
 */
function getBoundingBoxPath(element) {
  /** @type {import('../../types/types.js').PathAttValue|undefined} */
  const pathAtt = element.svgAtts.get('d');
  if (pathAtt === undefined) {
    return;
  }

  const commands = pathAtt.getParsedPath();
  if (commands.length === 0) {
    return;
  }

  /** @type {ExactNum} */
  let x1;
  /** @type {ExactNum} */
  let x2;
  /** @type {ExactNum} */
  let y1;
  /** @type {ExactNum} */
  let y2;
  const initialCmd = commands[0];
  switch (initialCmd.command) {
    case 'm':
      x1 = x2 = initialCmd.dx;
      y1 = y2 = initialCmd.dy;
      break;
    case 'M':
      x1 = x2 = initialCmd.x;
      y1 = y2 = initialCmd.y;
      break;
    default:
      return;
  }

  let cp = new ExactPoint(x1, y1);

  /**
   * @param {ExactPoint|undefined} newCp
   * @param {boolean} updateX
   * @param {boolean} updateY
   * @returns {boolean}
   */
  function updateBounds(newCp, updateX, updateY) {
    if (newCp === undefined) {
      return false;
    }
    cp = newCp;
    if (updateX) {
      if (cp.getX().getValue() < x1.getValue()) {
        x1 = cp.getX();
      } else if (cp.getX().getValue() > x2.getValue()) {
        x2 = cp.getX();
      }
    }
    if (updateY) {
      if (cp.getY().getValue() < y1.getValue()) {
        y1 = cp.getY();
      } else if (cp.getY().getValue() > y2.getValue()) {
        y2 = cp.getY();
      }
    }
    return true;
  }

  for (let index = 1; index < commands.length; index++) {
    const cmd = commands[index];
    switch (cmd.command) {
      case 'h':
        if (!updateBounds(cp.incr(cmd.dx), true, false)) {
          return;
        }
        break;
      case 'H':
        if (!updateBounds(new ExactPoint(cmd.x, cp.getY()), true, false)) {
          return;
        }
        break;
      case 'l':
      case 'm':
        if (!updateBounds(cp.incr(cmd.dx, cmd.dy), true, true)) {
          return;
        }
        break;
      case 'L':
      case 'M':
        if (!updateBounds(new ExactPoint(cmd.x, cmd.y), true, true)) {
          return;
        }
        break;
      case 'v':
        if (!updateBounds(cp.incr(undefined, cmd.dy), false, true)) {
          return;
        }
        break;
      case 'V':
        if (!updateBounds(new ExactPoint(cp.getX(), cmd.y), false, true)) {
          return;
        }
        break;
      default:
        return;
    }
  }

  return { x1: x1, y1: y1, x2: x2, y2: y2 };
}
