import { ExactNum } from './exactnum.js';

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

const ctSpace = Symbol();
const ctDigit = Symbol();
const ctCommand = Symbol();
const ctExponent = Symbol();
const ctDot = Symbol();
const ctComma = Symbol();
const ctSign = Symbol();

/**
 * @typedef {typeof ctSpace|ctDigit|ctCommand|ctExponent|ctDot|ctComma|ctSign} CharType
 */

/** @type {Map<string,Symbol>} */
const ctMap = new Map([
  ['0', ctDigit],
  ['1', ctDigit],
  ['2', ctDigit],
  ['3', ctDigit],
  ['4', ctDigit],
  ['5', ctDigit],
  ['6', ctDigit],
  ['7', ctDigit],
  ['8', ctDigit],
  ['9', ctDigit],
  [' ', ctSpace],
  ['\f', ctSpace],
  ['\n', ctSpace],
  ['\r', ctSpace],
  ['\t', ctSpace],
  ['a', ctCommand],
  ['A', ctCommand],
  ['c', ctCommand],
  ['C', ctCommand],
  ['h', ctCommand],
  ['H', ctCommand],
  ['l', ctCommand],
  ['L', ctCommand],
  ['m', ctCommand],
  ['M', ctCommand],
  ['q', ctCommand],
  ['Q', ctCommand],
  ['s', ctCommand],
  ['S', ctCommand],
  ['t', ctCommand],
  ['T', ctCommand],
  ['v', ctCommand],
  ['V', ctCommand],
  ['z', ctCommand],
  ['Z', ctCommand],
  ['e', ctExponent],
  ['E', ctExponent],
  ['.', ctDot],
  [',', ctComma],
  ['-', ctSign],
  ['+', ctSign],
]);

/**
 * @param {import('../lib/pathutils.js').PathCommand} c
 * @returns {(ExactNum|string)[]}
 */
export function getCmdArgs(c) {
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
 * @param {string} path
 * @param {number} [maxCommands]
 * @returns {PathCommand[]}
 */
export function parsePathCommands(path, maxCommands = Number.MAX_SAFE_INTEGER) {
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

  for (const c of path) {
    const ct = ctMap.get(c);
    switch (ct) {
      case ctCommand:
        addCurrentCommand(c);
        if (commands.length >= maxCommands) {
          return commands;
        }
        continue;
      case ctDot:
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
      case ctExponent:
        if (inExponent) {
          throw new PathParseError(`already in exponent: "${currentArg}"`);
        }
        inExponent = true;
        currentArg += 'e';
        continue;
      case ctSign:
        // Sign is allowed as first character of exponent, otherwise it begins a new argument.
        if (currentArg.length && currentArg[currentArg.length - 1] !== 'e') {
          addArg();
        }
        if (c !== '+') {
          currentArg += c;
        }
        hasComma = false;
        continue;
      case ctDigit:
        currentArg += c;
        hasComma = false;
        continue;
      case ctSpace:
        addArg();
        continue;
      case ctComma:
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
 * @param {string} cmdCode
 * @param {string} prevCmdChar
 * @param {string} lastNumber
 * @param  {(ExactNum|string)[]} args
 */
export function stringifyPathCommand(cmdCode, prevCmdChar, lastNumber, args) {
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
    (prevCmdChar === cmdCode && cmdCode !== 'm' && cmdCode !== 'M') ||
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
      const data = stringifyPathCommand(
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

export class PathParseError extends Error {
  /**
   * @param {string} msg
   */
  constructor(msg) {
    super(msg);
  }
}

/**
 * @param {string[]} args
 */
function fixArcFlags(args) {
  const newArgs = [];
  let index = 0;
  for (const arg of args) {
    switch (index % 7) {
      case 0:
      case 1:
      case 2:
      case 5:
      case 6:
        newArgs.push(arg);
        index++;
        break;
      case 3:
        switch (arg.length) {
          case 1:
            newArgs.push(arg);
            index = 4;
            break;
          case 2:
            newArgs.push(arg[0]);
            newArgs.push(arg[1]);
            index = 5;
            break;
          default:
            newArgs.push(arg[0]);
            newArgs.push(arg[1]);
            newArgs.push(arg.substring(2));
            index = 6;
            break;
        }
        break;
      case 4:
        if (arg.length === 1) {
          newArgs.push(arg);
          index = 5;
        } else {
          newArgs.push(arg[0]);
          newArgs.push(arg.substring(1));
          index = 6;
        }
        break;
    }
  }
  return newArgs;
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
      args = fixArcFlags(args);
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
