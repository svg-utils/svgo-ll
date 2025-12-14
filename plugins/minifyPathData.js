import { PathAttValue } from '../lib/attrs/pathAttValue.js';
import {
  getCmdArgs,
  PathParseError,
  stringifyPathCommand,
} from '../lib/pathutils.js';
import { ExactPoint } from '../lib/utils/exactPoint.js';
import { pathElems } from './_collections.js';

export const name = 'minifyPathData';
export const description = 'writes path commands in shortest form';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
 * @see https://svgwg.org/svg2-draft/paths.html#DProperty
 *
 * @type {import('./plugins-types.js').Plugin<'minifyPathData'>}
 */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector('d')
  ) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined || !pathElems.has(element.local)) {
          return;
        }

        const d = PathAttValue.getAttValue(element);
        if (d === undefined) {
          return;
        }
        if (d.isMinified()) {
          return;
        }

        const commands = d.getParsedPath();
        if (commands === null) {
          return;
        }
        const data = optimize(commands);
        if (data) {
          element.svgAtts.set('d', new PathAttValue(undefined, data, true));
        }
      },
    },
  };
};

/**
 * @param {import('../lib/pathutils.js').PathCommand} cmd
 * @param {ExactPoint} currentPoint
 * @returns {import('../lib/pathutils.js').PathCommand|undefined}
 */
function getAlternateCmd(cmd, currentPoint) {
  switch (cmd.command) {
    case 'A': {
      const dx = cmd.x.sub(currentPoint.getX());
      const dy = cmd.y.sub(currentPoint.getY());
      if (dx === undefined || dy === undefined) {
        return;
      }
      return {
        command: 'a',
        rx: cmd.rx,
        ry: cmd.ry,
        angle: cmd.angle,
        flagLgArc: cmd.flagLgArc,
        flagSweep: cmd.flagSweep,
        dx: dx,
        dy: dy,
      };
    }
    case 'c': {
      const cp1x = cmd.cp1x.add(currentPoint.getX());
      const cp1y = cmd.cp1y.add(currentPoint.getY());
      const cp2x = cmd.cp2x.add(currentPoint.getX());
      const cp2y = cmd.cp2y.add(currentPoint.getY());
      const x = cmd.dx.add(currentPoint.getX());
      const y = cmd.dy.add(currentPoint.getY());
      if (
        cp1x === undefined ||
        cp1y === undefined ||
        cp2x === undefined ||
        cp2y === undefined ||
        x === undefined ||
        y === undefined
      ) {
        return;
      }
      return {
        command: 'C',
        cp1x: cp1x,
        cp1y: cp1y,
        cp2x: cp2x,
        cp2y: cp2y,
        x: x,
        y: y,
      };
    }
    case 'C': {
      const cp1x = cmd.cp1x.sub(currentPoint.getX());
      const cp1y = cmd.cp1y.sub(currentPoint.getY());
      const cp2x = cmd.cp2x.sub(currentPoint.getX());
      const cp2y = cmd.cp2y.sub(currentPoint.getY());
      const dx = cmd.x.sub(currentPoint.getX());
      const dy = cmd.y.sub(currentPoint.getY());
      if (
        cp1x === undefined ||
        cp1y === undefined ||
        cp2x === undefined ||
        cp2y === undefined ||
        dx === undefined ||
        dy === undefined
      ) {
        return;
      }
      return {
        command: 'c',
        cp1x: cp1x,
        cp1y: cp1y,
        cp2x: cp2x,
        cp2y: cp2y,
        dx: dx,
        dy: dy,
      };
    }
    case 'h': {
      const x = cmd.dx.add(currentPoint.getX());
      return x === undefined ? undefined : { command: 'H', x: x };
    }
    case 'H': {
      const dx = cmd.x.sub(currentPoint.getX());
      if (dx === undefined) {
        return;
      }
      return { command: 'h', dx: dx };
    }
    case 'l':
    case 'm': {
      /** @type {'L'|'M'} */
      // @ts-ignore
      const altCmd = cmd.command.toUpperCase();
      const x = cmd.dx.add(currentPoint.getX());
      const y = cmd.dy.add(currentPoint.getY());
      if (x === undefined || y === undefined) {
        return;
      }
      return {
        command: altCmd,
        x: x,
        y: y,
      };
    }
    case 'L':
    case 'M':
    case 'T': {
      /** @type {'l'|'m'|'t'} */
      // @ts-ignore
      const altCmd = cmd.command.toLowerCase();
      const dx = cmd.x.sub(currentPoint.getX());
      const dy = cmd.y.sub(currentPoint.getY());
      if (dx === undefined || dy === undefined) {
        return;
      }
      return {
        command: altCmd,
        dx: dx,
        dy: dy,
      };
    }
    case 'Q': {
      const cp1x = cmd.cp1x.sub(currentPoint.getX());
      const cp1y = cmd.cp1y.sub(currentPoint.getY());
      const dx = cmd.x.sub(currentPoint.getX());
      const dy = cmd.y.sub(currentPoint.getY());
      if (
        cp1x === undefined ||
        cp1y === undefined ||
        dx === undefined ||
        dy === undefined
      ) {
        return;
      }
      return {
        command: 'q',
        cp1x: cp1x,
        cp1y: cp1y,
        dx: dx,
        dy: dy,
      };
    }
    case 'S': {
      const cp2x = cmd.cp2x.sub(currentPoint.getX());
      const cp2y = cmd.cp2y.sub(currentPoint.getY());
      const dx = cmd.x.sub(currentPoint.getX());
      const dy = cmd.y.sub(currentPoint.getY());
      if (
        cp2x === undefined ||
        cp2y === undefined ||
        dx === undefined ||
        dy === undefined
      ) {
        return;
      }
      return {
        command: 's',
        cp2x: cp2x,
        cp2y: cp2y,
        dx: dx,
        dy: dy,
      };
    }
    case 'v': {
      const y = cmd.dy.add(currentPoint.getY());
      return y === undefined
        ? undefined
        : {
            command: 'V',
            y: y,
          };
    }
    case 'V': {
      const dy = cmd.y.sub(currentPoint.getY());
      if (dy === undefined) {
        return;
      }
      return {
        command: 'v',
        dy: dy,
      };
    }
  }
}

/**
 * @param {import('../lib/pathutils.js').CBezAbs|import('../lib/pathutils.js').CBezRel} command
 * @param {ExactPoint} currentPoint
 * @param {ExactPoint|undefined} prevCtrlPt
 * @returns {import('../lib/pathutils.js').PathCommand}
 */
function minifyCubic(command, currentPoint, prevCtrlPt) {
  if (prevCtrlPt === undefined) {
    return command;
  }

  if (command.command === 'C') {
    const pt = reflectPoint(prevCtrlPt, currentPoint);
    if (pt === undefined) {
      return command;
    }

    if (
      command.cp1x.isEqualTo(pt.getX()) &&
      command.cp1y.isEqualTo(pt.getY())
    ) {
      return {
        command: 'S',
        cp2x: command.cp2x,
        cp2y: command.cp2y,
        x: command.x,
        y: command.y,
      };
    }
  } else {
    const dx = currentPoint.getX().sub(prevCtrlPt.getX());
    const dy = currentPoint.getY().sub(prevCtrlPt.getY());
    if (dx === undefined || dy === undefined) {
      return command;
    }

    if (command.cp1x.isEqualTo(dx) && command.cp1y.isEqualTo(dy)) {
      return {
        command: 's',
        cp2x: command.cp2x,
        cp2y: command.cp2y,
        dx: command.dx,
        dy: command.dy,
      };
    }
  }

  return command;
}

/**
 * @param {import('../lib/pathutils.js').QBezAbs|import('../lib/pathutils.js').QBezRel} command
 * @param {ExactPoint} currentPoint
 * @param {ExactPoint|undefined} prevCtrlPt
 * @returns {import('../lib/pathutils.js').PathCommand}
 */
function minifyQuadratic(command, currentPoint, prevCtrlPt) {
  if (prevCtrlPt === undefined) {
    return command;
  }

  if (command.command === 'Q') {
    const pt = reflectPoint(prevCtrlPt, currentPoint);
    if (pt === undefined) {
      return command;
    }

    if (
      command.cp1x.isEqualTo(pt.getX()) &&
      command.cp1y.isEqualTo(pt.getY())
    ) {
      return {
        command: 'T',
        x: command.x,
        y: command.y,
      };
    }
  } else {
    const dx = currentPoint.getX().sub(prevCtrlPt.getX());
    const dy = currentPoint.getY().sub(prevCtrlPt.getY());
    if (dx === undefined || dy === undefined) {
      return command;
    }

    if (command.cp1x.isEqualTo(dx) && command.cp1y.isEqualTo(dy)) {
      return {
        command: 't',
        dx: command.dx,
        dy: command.dy,
      };
    }
  }

  return command;
}

/**
 * @param {import('../lib/pathutils.js').PathCommand[]} commands
 * @returns {import('../lib/pathutils.js').PathCommand[]|undefined}
 */
function optimize(commands) {
  if (commands.length > 0) {
    switch (commands[0].command) {
      case 'm':
      case 'M':
        break;
      default:
        throw new PathParseError(
          `"${commands[0].command}" can not be the first command in a path`,
        );
    }
  }

  /** @type {import('../lib/pathutils.js').PathCommand[]} */
  const optimized = [];
  let currentPoint = ExactPoint.zero();
  let subpathStartPoint = ExactPoint.zero();
  let prevCmdChar = '';
  let lastNumber;
  /** @type {ExactPoint|undefined} */
  let prevCubicCtrlPt;
  /** @type {ExactPoint|undefined} */
  let prevQuadraticCtrlPt;

  for (let index = 0; index < commands.length; index++) {
    let command = commands[index];

    switch (command.command) {
      case 'c':
      case 'C':
        command = minifyCubic(command, currentPoint, prevCubicCtrlPt);
        break;
      case 'l':
        if (command.dy.getValue() === 0) {
          // Convert l dx 0 to h dx.
          command = { command: 'h', dx: command.dx };
        } else if (command.dx.getValue() === 0) {
          // Convert l 0 dy to v dy.
          command = { command: 'v', dy: command.dy };
        }
        break;
      case 'L':
        if (
          command.y.getMinifiedString() ===
          currentPoint.getY().getMinifiedString()
        ) {
          // Convert L x 0 to H x.
          command = { command: 'H', x: command.x };
        } else if (
          command.x.getMinifiedString() ===
          currentPoint.getX().getMinifiedString()
        ) {
          // Convert L 0 y to V y.
          command = { command: 'V', y: command.y };
        }
        break;
      case 'm':
        {
          const nextCommand =
            index < commands.length - 1 ? commands[index + 1].command : '';
          switch (nextCommand) {
            case 'M':
              // If the next command is "M", this one is useless.
              continue;
            case 'm':
              // If the next command is 'm', merge this one into the next one.
              {
                const cmd =
                  /** @type {import('../lib/pathutils.js').MoveRel} */ (
                    commands[index + 1]
                  );
                const dx = cmd.dx.add(command.dx);
                const dy = cmd.dy.add(command.dy);
                if (dx === undefined || dy === undefined) {
                  return;
                }
                cmd.dx = dx;
                cmd.dy = dy;
              }
              continue;
            default:
              {
                const x = currentPoint.getX().add(command.dx);
                const y = currentPoint.getY().add(command.dy);
                if (x === undefined || y === undefined) {
                  return;
                }
                // Otherwise update the start point.
                subpathStartPoint = new ExactPoint(x, y);
              }
              break;
          }
        }
        break;
      case 'M':
        // If the next command is "M", this one is useless.
        if (
          index < commands.length - 1 &&
          commands[index + 1].command === 'M'
        ) {
          continue;
        }
        subpathStartPoint = new ExactPoint(command.x, command.y);
        break;
      case 'q':
      case 'Q':
        command = minifyQuadratic(command, currentPoint, prevQuadraticCtrlPt);
        break;
    }

    if (optimized.length > 0) {
      // Try both relative and absolute versions, and use whichever is shorter.
      /** @type {import('../lib/pathutils.js').PathCommand|undefined} */
      let otherVersion = getAlternateCmd(command, currentPoint);

      if (otherVersion) {
        const strCmd = stringifyPathCommand(
          command.command,
          prevCmdChar,
          lastNumber,
          getCmdArgs(command),
        );
        const strOther = stringifyPathCommand(
          otherVersion.command,
          prevCmdChar,
          lastNumber,
          getCmdArgs(otherVersion),
        );
        const diff = strOther.result.length - strCmd.result.length;
        if (
          diff < 0 ||
          // Prefer relative commands if they are the same length; this should generally result in shorter numbers.
          (diff === 0 &&
            otherVersion.command === otherVersion.command.toLowerCase())
        ) {
          command = otherVersion;
        }
      }
    }

    optimized.push(command);

    const oldCurrentPoint = currentPoint;

    // Update current point.
    switch (command.command) {
      case 'z':
        currentPoint = subpathStartPoint;
        subpathStartPoint = currentPoint;
        break;
      case 'a':
      case 'c':
      case 'l':
      case 'm':
      case 'q':
      case 's':
      case 't':
        {
          const cp = currentPoint.incr(command.dx, command.dy);
          if (cp === undefined) {
            return;
          }
          currentPoint = cp;
        }
        break;
      case 'h':
        {
          const cp = currentPoint.incr(command.dx);
          if (cp === undefined) {
            return;
          }
          currentPoint = cp;
        }
        break;
      case 'v':
        {
          const cp = currentPoint.incr(undefined, command.dy);
          if (cp === undefined) {
            return;
          }
          currentPoint = cp;
        }
        break;
      case 'H':
        currentPoint = new ExactPoint(command.x, currentPoint.getY());
        break;
      case 'V':
        currentPoint = new ExactPoint(currentPoint.getX(), command.y);
        break;
      default:
        currentPoint = new ExactPoint(command.x, command.y);
        break;
    }

    // Update previous control point.
    switch (command.command) {
      case 'c':
      case 's':
        prevCubicCtrlPt = oldCurrentPoint.incr(command.cp2x, command.cp2y);
        prevQuadraticCtrlPt = currentPoint;
        break;
      case 'C':
      case 'S':
        prevCubicCtrlPt = new ExactPoint(command.cp2x, command.cp2y);
        prevQuadraticCtrlPt = currentPoint;
        break;
      case 'Q':
        prevQuadraticCtrlPt = new ExactPoint(command.cp1x, command.cp1y);
        prevCubicCtrlPt = currentPoint;
        break;
      case 'q':
        prevQuadraticCtrlPt = oldCurrentPoint.incr(command.cp1x, command.cp1y);
        prevCubicCtrlPt = currentPoint;
        break;
      case 't':
      case 'T':
        prevQuadraticCtrlPt =
          prevQuadraticCtrlPt === undefined
            ? undefined
            : reflectPoint(prevQuadraticCtrlPt, oldCurrentPoint);
        prevCubicCtrlPt = currentPoint;
        break;
      case 'z':
        prevCubicCtrlPt = prevQuadraticCtrlPt = undefined;
        break;
      default:
        prevCubicCtrlPt = prevQuadraticCtrlPt = currentPoint;
        break;
    }

    prevCmdChar = command.command;
    const cmdArgs = getCmdArgs(command);
    lastNumber =
      cmdArgs.length > 0
        ? // @ts-ignore - last argument is always ExactNum
          cmdArgs[cmdArgs.length - 1].getMinifiedString()
        : undefined;
  }
  return optimized;
}

/**
 * @param {ExactPoint} point
 * @param {ExactPoint} reflectionPt
 * @returns {ExactPoint|undefined}
 */
function reflectPoint(point, reflectionPt) {
  const x = reflectionPt.getX().add(reflectionPt.getX().sub(point.getX()));
  const y = reflectionPt.getY().add(reflectionPt.getY().sub(point.getY()));
  if (x === undefined || y === undefined) {
    return;
  }
  return new ExactPoint(x, y);
}
