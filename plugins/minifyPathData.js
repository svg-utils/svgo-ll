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

        let data;
        try {
          data = d.getParsedPath();
        } catch (error) {
          if (error instanceof PathParseError) {
            console.warn(error.message);
            return;
          }
          throw error;
        }
        data = optimize(data);
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

  for (let index = 0; index < commands.length; index++) {
    let command = commands[index];

    switch (command.command) {
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
                /** @type {import('../lib/pathutils.js').MoveRel} */
                // @ts-ignore
                const cmd = commands[index + 1];
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
        subpathStartPoint = new ExactPoint(
          command.x.clone(),
          command.y.clone(),
        );
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

    // Update current point.
    switch (command.command) {
      case 'z':
        currentPoint = subpathStartPoint;
        subpathStartPoint = currentPoint.clone();
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
        currentPoint.setX(command.x.clone());
        break;
      case 'V':
        currentPoint.setY(command.y.clone());
        break;
      default:
        currentPoint = new ExactPoint(command.x.clone(), command.y.clone());
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
