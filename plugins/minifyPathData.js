import { ExactNum } from '../lib/exactnum.js';
import {
  getCmdArgs,
  parsePathCommands,
  PathParseError,
  stringifyPathCommand,
  stringifyPathCommands,
} from '../lib/pathutils.js';
import { pathElems } from './_collections.js';

export const name = 'minifyPathData';
export const description = 'writes path commands in shortest form';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
 * @see https://svgwg.org/svg2-draft/paths.html#DProperty
 *
 * @type {import('./plugins-types.js').Plugin<'minifyPathData'>}
 */
export const fn = (root, params, info) => {
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
        if (pathElems.has(element.name) && element.attributes.d !== undefined) {
          let data;
          try {
            data = parsePathCommands(element.attributes.d.toString());
          } catch (error) {
            if (error instanceof PathParseError) {
              console.warn(error.message);
              return;
            }
            throw error;
          }
          data = optimize(data);
          element.attributes.d = stringifyPathCommands(data);
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
    case 'A':
      return {
        command: 'a',
        rx: cmd.rx,
        ry: cmd.ry,
        angle: cmd.angle,
        flagLgArc: cmd.flagLgArc,
        flagSweep: cmd.flagSweep,
        dx: cmd.x.sub(currentPoint.getX()),
        dy: cmd.y.sub(currentPoint.getY()),
      };
    case 'C':
      return {
        command: 'c',
        cp1x: cmd.cp1x.sub(currentPoint.getX()),
        cp1y: cmd.cp1y.sub(currentPoint.getY()),
        cp2x: cmd.cp2x.sub(currentPoint.getX()),
        cp2y: cmd.cp2y.sub(currentPoint.getY()),
        dx: cmd.x.sub(currentPoint.getX()),
        dy: cmd.y.sub(currentPoint.getY()),
      };
    case 'h':
      return { command: 'H', x: cmd.dx.add(currentPoint.getX()) };
    case 'H':
      return { command: 'h', dx: cmd.x.sub(currentPoint.getX()) };
    case 'l':
    case 'm':
      return {
        // @ts-ignore
        command: cmd.command.toUpperCase(),
        x: cmd.dx.add(currentPoint.getX()),
        y: cmd.dy.add(currentPoint.getY()),
      };
    case 'L':
    case 'M':
    case 'T':
      return {
        // @ts-ignore
        command: cmd.command.toLowerCase(),
        dx: cmd.x.sub(currentPoint.getX()),
        dy: cmd.y.sub(currentPoint.getY()),
      };
    case 'Q':
      return {
        command: 'q',
        cp1x: cmd.cp1x.sub(currentPoint.getX()),
        cp1y: cmd.cp1y.sub(currentPoint.getY()),
        dx: cmd.x.sub(currentPoint.getX()),
        dy: cmd.y.sub(currentPoint.getY()),
      };
    case 'S':
      return {
        command: 's',
        cp2x: cmd.cp2x.sub(currentPoint.getX()),
        cp2y: cmd.cp2y.sub(currentPoint.getY()),
        dx: cmd.x.sub(currentPoint.getX()),
        dy: cmd.y.sub(currentPoint.getY()),
      };
    case 'v':
      return {
        command: 'V',
        y: cmd.dy.add(currentPoint.getY()),
      };
    case 'V':
      return {
        command: 'v',
        dy: cmd.y.sub(currentPoint.getY()),
      };
  }
}

/**
 * @param {import('../lib/pathutils.js').PathCommand[]} commands
 * @returns {import('../lib/pathutils.js').PathCommand[]}
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
                cmd.dx = cmd.dx.add(command.dx);
                cmd.dy = cmd.dy.add(command.dy);
              }
              continue;
            default:
              // Otherwise update the start point.
              subpathStartPoint = new ExactPoint(
                currentPoint.getX().add(command.dx),
                currentPoint.getY().add(command.dy),
              );
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
        currentPoint.incr(command.dx, command.dy);
        break;
      case 'h':
        currentPoint.incr(command.dx);
        break;
      case 'v':
        currentPoint.incr(undefined, command.dy);
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

class ExactPoint {
  #x;
  #y;

  /**
   * @param {ExactNum} x
   * @param {ExactNum} y
   */
  constructor(x, y) {
    this.#x = x;
    this.#y = y;
  }

  clone() {
    return new ExactPoint(this.#x.clone(), this.#y.clone());
  }

  getX() {
    return this.#x;
  }

  getY() {
    return this.#y;
  }

  /**
   * @param {ExactNum|undefined} dx
   * @param {ExactNum} [dy]
   */
  incr(dx, dy) {
    if (dx) {
      this.#x.incr(dx);
    }
    if (dy) {
      this.#y.incr(dy);
    }
  }

  /**
   * @param {ExactNum} x
   */
  setX(x) {
    this.#x = x;
  }

  /**
   * @param {ExactNum} y
   */
  setY(y) {
    this.#y = y;
  }

  static zero() {
    return new ExactPoint(new ExactNum(0), new ExactNum(0));
  }
}
