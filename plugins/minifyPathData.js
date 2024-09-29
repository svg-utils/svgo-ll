import { getNumberOfDecimalDigits, toFixed } from '../lib/svgo/tools.js';
import { pathElems } from './_collections.js';

/**
 * @typedef {{dx:ExactNum,dy:ExactNum}} DxDyCmd
 * @typedef {{x:ExactNum,y:ExactNum}} XYCmd
 * @typedef {{rx:ExactNum,ry:ExactNum,angle:ExactNum,flagLgArc:'0'|'1',flagSweep:'0'|'1'}} ArcCmd
 * @typedef {{cp1x:ExactNum,cp1y:ExactNum,cp2x:ExactNum,cp2y:ExactNum}} CBezCmd
 * @typedef {{'command':'A'}&ArcCmd&XYCmd} ArcAbs
 * @typedef {{'command':'a'}&ArcCmd&DxDyCmd} ArcRel
 * @typedef {{'command':'C'}&CBezCmd&XYCmd} CBezAbs
 * @typedef {{'command':'c'}&CBezCmd&DxDyCmd} CBezRel
 * @typedef {{'command':'H',x:ExactNum}} HAbs
 * @typedef {{'command':'h',dx:ExactNum}} HRel
 * @typedef {{'command':'L'}&XYCmd} LineAbs
 * @typedef {{'command':'l'}&DxDyCmd} LineRel
 * @typedef {{'command':'M'}&XYCmd} MoveAbs
 * @typedef {{'command':'m'}&DxDyCmd} MoveRel
 * @typedef {{'command':'Q',cp1x:ExactNum,cp1y:ExactNum}&XYCmd} QBezAbs
 * @typedef {{'command':'q',cp1x:ExactNum,cp1y:ExactNum}&DxDyCmd} QBezRel
 * @typedef {{'command':'S',cp2x:ExactNum,cp2y:ExactNum}&XYCmd} SBezAbs
 * @typedef {{'command':'s',cp2x:ExactNum,cp2y:ExactNum}&DxDyCmd} SBezRel
 * @typedef {{'command':'T'}&XYCmd} TBezAbs
 * @typedef {{'command':'t'}&DxDyCmd} TBezRel
 * @typedef {{'command':'V',y:ExactNum}} VAbs
 * @typedef {{'command':'v',dy:ExactNum}} VRel
 * @typedef {{'command':'z'}} ZCmd
 * @typedef {ArcRel|CBezRel|HRel|LineRel|MoveRel|QBezRel|SBezRel|TBezRel|VRel} RelCommand
 * @typedef {ArcAbs|CBezAbs|HAbs|LineAbs|MoveAbs|QBezAbs|SBezAbs|TBezAbs|VAbs} AbsCommand
 * @typedef {RelCommand|AbsCommand|ZCmd} PathCommand
 */

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
      enter: (element, parentNode, parentInfo) => {
        if (pathElems.has(element.name) && element.attributes.d !== undefined) {
          let data;
          try {
            data = parsePathCommands(element.attributes.d);
          } catch (error) {
            if (error instanceof PathParseError) {
              console.warn(error.message);
              return;
            }
            throw error;
          }
          const computedStyle = styleData.computeStyle(element, parentInfo);
          data = optimize(data, computedStyle);
          element.attributes.d = stringifyPathCommands(data);
        }
      },
    },
  };
};

/**
 * @param {PathCommand} cmd
 * @param {ExactPoint} currentPoint
 * @returns {PathCommand|undefined}
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
 * @param {string} c
 * @returns {'space'|'command'|'digit'|'.'|','|'sign'|'e'}
 */
function getCharType(c) {
  switch (c) {
    case ' ':
    case '\n':
    case '\r':
    case '\t':
      return 'space';
    case 'a':
    case 'A':
    case 'c':
    case 'C':
    case 'h':
    case 'H':
    case 'l':
    case 'L':
    case 'm':
    case 'M':
    case 'q':
    case 'Q':
    case 's':
    case 'S':
    case 't':
    case 'T':
    case 'v':
    case 'V':
    case 'z':
    case 'Z':
      return 'command';
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
      return 'digit';
    case 'e':
    case 'E':
      return 'e';
    case '.':
    case ',':
      return c;
    case '-':
    case '+':
      return 'sign';
    default:
      throw new Error(`unexpected character "${c}" in path`);
  }
}

/**
 * @param {PathCommand} c
 * @returns {(ExactNum|string)[]}
 */
function getCmdArgs(c) {
  switch (c.command) {
    case 'a':
      return [c.rx, c.ry, c.angle, c.flagLgArc, c.flagSweep, c.dx, c.dy];
    case 'A':
      return [c.rx, c.ry, c.angle, c.flagLgArc, c.flagSweep, c.x, c.y];
    case 'c':
      return [c.cp1x, c.cp1y, c.cp2x, c.cp2y, c.dx, c.dy];
    case 'C':
      return [c.cp1x, c.cp1y, c.cp2x, c.cp2y, c.x, c.y];
    case 'h':
      return [c.dx];
    case 'H':
      return [c.x];
    case 'l':
    case 'm':
    case 't':
      return [c.dx, c.dy];
    case 'L':
    case 'M':
    case 'T':
      return [c.x, c.y];
    case 'q':
      return [c.cp1x, c.cp1y, c.dx, c.dy];
    case 'Q':
      return [c.cp1x, c.cp1y, c.x, c.y];
    case 's':
      return [c.cp2x, c.cp2y, c.dx, c.dy];
    case 'S':
      return [c.cp2x, c.cp2y, c.x, c.y];
    case 'v':
      return [c.dy];
    case 'V':
      return [c.y];
  }
  return [];
}

/**
 * @param {string} commandCode
 * @param {string[]} args
 * @returns {PathCommand[]}
 */
function makeCommand(commandCode, args) {
  if (commandCode === '') {
    return [];
  }
  switch (commandCode) {
    case 'a':
    case 'A': {
      if (args.length === 0 || args.length % 7 !== 0) {
        throw new PathParseError(
          `number of arguments found for path command "${commandCode} must be a multiple of 7"`,
        );
      }
      const commands = [];
      for (let index = 0; index < args.length; index += 7) {
        /**
         * @param {string} str
         * @returns {'0'|'1'}
         */
        function getFlagValue(str) {
          if (str === '0' || str === '1') {
            return str;
          }
          throw new PathParseError(`invalid flag value "${str}"`);
        }
        if (commandCode === 'a') {
          commands.push({
            command: commandCode,
            rx: new ExactNum(args[index + 0]),
            ry: new ExactNum(args[index + 1]),
            angle: new ExactNum(args[index + 2]),
            flagLgArc: getFlagValue(args[index + 3]),
            flagSweep: getFlagValue(args[index + 4]),
            dx: new ExactNum(args[index + 5]),
            dy: new ExactNum(args[index + 6]),
          });
        } else {
          commands.push({
            command: commandCode,
            rx: new ExactNum(args[index + 0]),
            ry: new ExactNum(args[index + 1]),
            angle: new ExactNum(args[index + 2]),
            flagLgArc: getFlagValue(args[index + 3]),
            flagSweep: getFlagValue(args[index + 4]),
            x: new ExactNum(args[index + 5]),
            y: new ExactNum(args[index + 6]),
          });
        }
      }
      return commands;
    }
    case 'c':
    case 'C': {
      if (args.length === 0 || args.length % 6 !== 0) {
        throw new PathParseError(
          `number of arguments found for path command "${commandCode} must be a multiple of 6"`,
        );
      }
      const commands = [];
      for (let index = 0; index < args.length; index += 6) {
        if (commandCode === 'c') {
          commands.push({
            command: commandCode,
            cp1x: new ExactNum(args[index + 0]),
            cp1y: new ExactNum(args[index + 1]),
            cp2x: new ExactNum(args[index + 2]),
            cp2y: new ExactNum(args[index + 3]),
            dx: new ExactNum(args[index + 4]),
            dy: new ExactNum(args[index + 5]),
          });
        } else {
          commands.push({
            command: commandCode,
            cp1x: new ExactNum(args[index + 0]),
            cp1y: new ExactNum(args[index + 1]),
            cp2x: new ExactNum(args[index + 2]),
            cp2y: new ExactNum(args[index + 3]),
            x: new ExactNum(args[index + 4]),
            y: new ExactNum(args[index + 5]),
          });
        }
      }
      return commands;
    }
    case 'h':
    case 'H':
    case 'v':
    case 'V': {
      const commands = [];
      if (args.length === 0) {
        `"${commandCode}" command requires at least one argument`;
      }
      for (const arg of args) {
        switch (commandCode) {
          case 'h':
            commands.push({
              command: commandCode,
              dx: new ExactNum(arg),
            });
            break;
          case 'v':
            commands.push({
              command: commandCode,
              dy: new ExactNum(arg),
            });
            break;
          case 'H':
            commands.push({
              command: commandCode,
              x: new ExactNum(arg),
            });
            break;
          case 'V':
            commands.push({
              command: commandCode,
              y: new ExactNum(arg),
            });
            break;
        }
      }
      return commands;
    }
    case 'l':
    case 'm':
    case 'L':
    case 'M': {
      if (args.length === 0 || args.length % 2 !== 0) {
        throw new PathParseError(
          `odd number of arguments found for path command "${commandCode}"`,
        );
      }
      /** @type {PathCommand[]} */
      const commands = [];
      if (commandCode === 'l' || commandCode === 'm') {
        commands.push(makeDxDyCommand(commandCode, args[0], args[1]));
      } else {
        commands.push(makeXYCommand(commandCode, args[0], args[1]));
      }
      const lineCommandCode =
        commandCode === 'l' || commandCode === 'm' ? 'l' : 'L';
      for (let index = 2; index < args.length; index += 2) {
        switch (lineCommandCode) {
          case 'l':
            commands.push(
              makeDxDyCommand(lineCommandCode, args[index], args[index + 1]),
            );
            break;
          case 'L':
            commands.push(
              makeXYCommand(lineCommandCode, args[index], args[index + 1]),
            );
            break;
        }
      }
      return commands;
    }
    case 'q':
    case 'Q':
    case 's':
    case 'S': {
      if (args.length === 0 || args.length % 4 !== 0) {
        throw new PathParseError(
          `number of arguments found for path command "${commandCode} must be a multiple of 4"`,
        );
      }
      const commands = [];
      for (let index = 0; index < args.length; index += 4) {
        switch (commandCode) {
          case 'q':
            commands.push({
              command: commandCode,
              cp1x: new ExactNum(args[index + 0]),
              cp1y: new ExactNum(args[index + 1]),
              dx: new ExactNum(args[index + 2]),
              dy: new ExactNum(args[index + 3]),
            });
            break;
          case 'Q':
            commands.push({
              command: commandCode,
              cp1x: new ExactNum(args[index + 0]),
              cp1y: new ExactNum(args[index + 1]),
              x: new ExactNum(args[index + 2]),
              y: new ExactNum(args[index + 3]),
            });
            break;
          case 's':
            commands.push({
              command: commandCode,
              cp2x: new ExactNum(args[index + 0]),
              cp2y: new ExactNum(args[index + 1]),
              dx: new ExactNum(args[index + 2]),
              dy: new ExactNum(args[index + 3]),
            });
            break;
          case 'S':
            commands.push({
              command: commandCode,
              cp2x: new ExactNum(args[index + 0]),
              cp2y: new ExactNum(args[index + 1]),
              x: new ExactNum(args[index + 2]),
              y: new ExactNum(args[index + 3]),
            });
            break;
        }
      }
      return commands;
    }
    case 't':
    case 'T': {
      if (args.length === 0 || args.length % 2 !== 0) {
        throw new PathParseError(
          `number of arguments found for path command "${commandCode} must be a multiple of 2"`,
        );
      }
      const commands = [];
      for (let index = 0; index < args.length; index += 2) {
        switch (commandCode) {
          case 't':
            commands.push(makeDxDyCommand('t', args[index], args[index + 1]));
            break;
          case 'T':
            commands.push(makeXYCommand('T', args[index], args[index + 1]));
            break;
        }
      }
      return commands;
    }
    case 'z':
    case 'Z':
      return [{ command: 'z' }];
    default:
      throw new PathParseError(`unexpected command "${commandCode}"`);
  }
}

/**
 * @param {'L'|'M'|'T'} command
 * @param {string} arg1
 * @param {string} arg2
 * @returns {LineAbs|MoveAbs|TBezAbs}
 */
function makeXYCommand(command, arg1, arg2) {
  return {
    command: command,
    x: new ExactNum(arg1),
    y: new ExactNum(arg2),
  };
}

/**
 * @param {'l'|'m'|'t'} command
 * @param {string} arg1
 * @param {string} arg2
 * @returns {LineRel|MoveRel|TBezRel}
 */
function makeDxDyCommand(command, arg1, arg2) {
  return {
    command: command,
    dx: new ExactNum(arg1),
    dy: new ExactNum(arg2),
  };
}

/**
 * @param {PathCommand[]} commands
 * @param {Map<string,string|null>} properties
 * @returns {PathCommand[]}
 */
function optimize(commands, properties) {
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

  /** @type {PathCommand[]} */
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
        // If the next command is "M", this one is useless.
        if (
          index < commands.length - 1 &&
          commands[index + 1].command === 'M'
        ) {
          continue;
        }
        subpathStartPoint = new ExactPoint(
          currentPoint.getX().add(command.dx),
          currentPoint.getY().add(command.dy),
        );
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
      /** @type {PathCommand|undefined} */
      let otherVersion = getAlternateCmd(command, currentPoint);

      if (otherVersion) {
        const strCmd = stringifyCommand(
          command.command,
          prevCmdChar,
          lastNumber,
          getCmdArgs(command),
        );
        const strOther = stringifyCommand(
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

    const lineCap = properties.get('stroke-linecap');
    if (lineCap === undefined || lineCap === 'butt') {
      if (command.command === 'h' && command.dx.getMinifiedString() === '0') {
        continue;
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

/**
 * @param {string} cmdCode
 * @param {string} prevCmdChar
 * @param {string} lastNumber
 * @param  {(ExactNum|string)[]} args
 */
function stringifyCommand(cmdCode, prevCmdChar, lastNumber, args) {
  /**
   * @param {string} arg
   */
  function needSpaceBefore(arg) {
    return !(
      arg.startsWith('-') ||
      (arg.startsWith('.') &&
        (lastNumber.includes('.') || lastNumber.includes('e')))
    );
  }

  let result = '';
  // If last command was the same, no need to repeat it.
  const omitCommandCode =
    prevCmdChar === cmdCode ||
    (prevCmdChar === 'M' && cmdCode === 'L') ||
    (prevCmdChar === 'm' && cmdCode === 'l');
  if (!omitCommandCode) {
    result += cmdCode;
  }
  for (let index = 0; index < args.length; index++) {
    let arg = args[index];
    if (arg instanceof ExactNum) {
      arg = arg.getMinifiedString();
    }
    if (index === 0) {
      // Don't print space unless we're omitting the command, and we need a space before the first arg.
      if (omitCommandCode && needSpaceBefore(arg)) {
        result += ' ';
      }
    } else if (needSpaceBefore(arg)) {
      result += ' ';
    }
    result += arg;
    lastNumber = arg;
  }

  prevCmdChar = cmdCode;
  return { result: result, lastNumber: lastNumber };
}

/**
 * @param {string} path
 * @returns {PathCommand[]}
 */
export function parsePathCommands(path) {
  function addArg() {
    if (currentArg !== '') {
      args.push(currentArg);
      currentArg = '';
    }
    hasComma = false;
    hasDecimal = false;
    inExponent = false;
  }

  /**
   * @param {string} nextCommand
   */
  function addCurrentCommand(nextCommand) {
    addArg();
    commands.push(...makeCommand(currentCommand, args));
    currentCommand = nextCommand;
    args = [];
    currentArg = '';
  }

  /*** @type {PathCommand[]} */
  const commands = [];
  /** @type {string} */
  let currentCommand = '';
  /** @type {string[]} */
  let args = [];
  /** @type {string} */
  let currentArg = '';
  // true if we have seen one comma between arguments
  let hasComma = false;
  // true if we have already seen a decimal point in the current arg.
  let hasDecimal = false;
  // true if we are in the exponent portion of a number.
  let inExponent = false;

  for (let index = 0; index < path.length; index++) {
    const c = path[index];
    switch (getCharType(c)) {
      case 'command':
        addCurrentCommand(c);
        continue;
      case '.':
        if (currentCommand === '') {
          throw new PathParseError('unexpected "." in path data');
        }
        if (hasDecimal || inExponent) {
          addArg();
        }
        currentArg += c;
        hasDecimal = true;
        hasComma = false;
        continue;
      case 'e':
        if (inExponent) {
          throw new PathParseError(`already in exponent: "${currentArg}"`);
        }
        inExponent = true;
        currentArg += 'e';
        continue;
      case 'sign':
        // Sign is allowed as first character of exponent, otherwise it begins a new argument.
        if (currentArg.length && currentArg[currentArg.length - 1] !== 'e') {
          addArg();
        }
        if (c !== '+') {
          currentArg += c;
        }
        hasComma = false;
        continue;
      case 'digit':
        currentArg += c;
        hasComma = false;
        continue;
      case 'space':
        addArg();
        continue;
      case ',':
        // Treat comma the same as space, except no more than one comma between args, and no commas before first arg.
        if ((currentArg === '' && args.length === 0) || hasComma) {
          throw new PathParseError('comma not allowed before first argument');
        }
        addArg();
        hasComma = true;
        break;
      default:
        throw new PathParseError(`unexpected character "${c}"`);
    }
  }

  addCurrentCommand('');

  return commands;
}

/**
 * @param {PathCommand[]} commands
 * @returns {string}
 */
export function stringifyPathCommands(commands) {
  let result = '';
  let prevCommand = '';
  let lastNumber = '';
  for (const command of commands) {
    if (command.command === 'z') {
      result += 'z';
      prevCommand = 'z';
    } else {
      const data = stringifyCommand(
        command.command,
        prevCommand,
        lastNumber,
        getCmdArgs(command),
      );
      result += data.result;
      prevCommand = command.command;
      lastNumber = data.lastNumber;
    }
  }
  return result;
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

class ExactNum {
  /** @type {string|undefined} */
  #str;
  /** @type {number|undefined} */
  #value;
  /** @type {number|undefined} */
  #numDigits;
  /** @type {string|undefined} */
  #minifiedString;

  /**
   * @param {string|number} n
   */
  constructor(n) {
    if (typeof n === 'string') {
      this.#str = n;
    } else {
      this.#value = n;
    }
  }

  clone() {
    const n = new ExactNum('');
    n.#str = this.#str;
    n.#value = this.#value;
    n.#numDigits = this.#numDigits;
    n.#minifiedString = this.#minifiedString;
    return n;
  }

  #generateMinifiedString() {
    const n = this.getValue();

    // Use exponential if it is shorter.
    if (n !== 0 && n < 0.001 && n > -0.001) {
      return n.toExponential();
    }

    // Otherwise trim leading 0 from before the decimal if there is one.
    const strValue = toFixed(n, this.getNumberOfDigits()).toString();
    if (0 < n && n < 1 && strValue.startsWith('0')) {
      return strValue.slice(1);
    }
    if (-1 < n && n < 0 && strValue[1] === '0') {
      return strValue[0] + strValue.slice(2);
    }
    return strValue;
  }

  getMinifiedString() {
    if (this.#minifiedString === undefined) {
      this.#minifiedString = this.#generateMinifiedString();
    }
    return this.#minifiedString;
  }

  getNumberOfDigits() {
    if (this.#numDigits === undefined) {
      this.#numDigits = getNumberOfDecimalDigits(this.#getString());
    }
    return this.#numDigits;
  }

  #getString() {
    if (this.#str === undefined) {
      if (this.#value === undefined) {
        // One or the other should always be defined; should never get here.
        throw new Error();
      }
      this.#str = this.#value.toString();
    }
    return this.#str;
  }

  getValue() {
    if (this.#value === undefined) {
      this.#value = parseFloat(this.#getString());
    }
    return this.#value;
  }

  /**
   * @param {ExactNum} n
   * @param {boolean} [decrement=false]
   */
  incr(n, decrement = false) {
    const value = this.getValue();
    const numDigits = this.getNumberOfDigits();
    this.#str = undefined;
    this.#minifiedString = undefined;
    if (decrement) {
      this.#value = value - n.getValue();
    } else {
      this.#value = value + n.getValue();
    }
    this.#numDigits = Math.max(numDigits, n.getNumberOfDigits());
  }

  /**
   * @param {ExactNum} n
   * @returns {ExactNum}
   */
  add(n) {
    const ret = this.clone();
    ret.incr(n);
    return ret;
  }

  /**
   * @param {ExactNum} n
   * @returns {ExactNum}
   */
  sub(n) {
    const ret = this.clone();
    ret.incr(n, true);
    return ret;
  }
}

class PathParseError extends Error {
  /**
   * @param {string} msg
   */
  constructor(msg) {
    super(msg);
  }
}
