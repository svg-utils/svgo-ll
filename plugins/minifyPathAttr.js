import { getNumberOfDecimalDigits, toFixed } from '../lib/svgo/tools.js';
import { pathElems } from './_collections.js';

/**
 * @typedef {{'command':'C',cp1x:ExactNum,cp1y:ExactNum,cp2x:ExactNum,cp2y:ExactNum,x:ExactNum,y:ExactNum}} CBezAbs
 * @typedef {{'command':'h',dx:ExactNum}} HRel
 * @typedef {{'command':'L',x:ExactNum,y:ExactNum}} LineAbs
 * @typedef {{'command':'l',dx:ExactNum,dy:ExactNum}} LineRel
 * @typedef {{'command':'M',x:ExactNum,y:ExactNum}} MoveAbs
 * @typedef {{'command':'m',dx:ExactNum,dy:ExactNum}} MoveRel
 * @typedef {{'command':'S',cp2x:ExactNum,cp2y:ExactNum,x:ExactNum,y:ExactNum}} SBezAbs
 * @typedef {HRel|LineRel|MoveRel} RelCommand
 * @typedef {CBezAbs|LineAbs|MoveAbs|SBezAbs} AbsCommand
 * @typedef {RelCommand|AbsCommand} PathCommand
 */

export const name = 'minifyPathAttr';
export const description = 'writes path commands in shortest form';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
 * @see https://svgwg.org/svg2-draft/paths.html#DProperty
 *
 * @type {import('./plugins-types.js').Plugin<'minifyPathAttr'>}
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
      enter: (node) => {
        if (pathElems.has(node.name) && node.attributes.d !== undefined) {
          let origData;
          try {
            origData = parsePathCommands(node.attributes.d);
          } catch (error) {
            if (error instanceof PathParseError) {
              console.warn(error.message);
              return;
            }
            throw error;
          }
          let data = normalize(origData);
          node.attributes.d = stringifyPathCommands(data);
        }
      },
    },
  };
};

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
    case 'c':
    case 'C':
    case 'h':
    case 'H':
    case 'l':
    case 'L':
    case 'm':
    case 'M':
    case 's':
    case 'S':
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
 * @param {string} command
 * @param {string[]} args
 * @returns {PathCommand[]}
 */
function makeCommand(command, args) {
  if (command === '') {
    return [];
  }
  switch (command) {
    case 'C': {
      if (args.length === 0 || args.length % 6 !== 0) {
        throw new PathParseError(
          `number of arguments found for path command "${command} must be a multiple of 6"`,
        );
      }
      const commands = [];
      for (let index = 0; index < args.length; index += 6) {
        commands.push({
          command: command,
          cp1x: new ExactNum(args[index + 0]),
          cp1y: new ExactNum(args[index + 1]),
          cp2x: new ExactNum(args[index + 2]),
          cp2y: new ExactNum(args[index + 3]),
          x: new ExactNum(args[index + 4]),
          y: new ExactNum(args[index + 5]),
        });
      }
      return commands;
    }
    case 'h': {
      const commands = [];
      if (args.length === 0) {
        `"${command}" command requires at least one argument`;
      }
      for (const arg of args) {
        commands.push({
          command: command,
          dx: new ExactNum(arg),
        });
      }
      return commands;
    }
    case 'l':
    case 'm':
    case 'L':
    case 'M': {
      if (args.length === 0 || args.length % 2 !== 0) {
        throw new PathParseError(
          `odd number of arguments found for path command "${command}"`,
        );
      }
      const commandFunc =
        command === 'l' || command === 'm'
          ? makeMLCommandRel
          : makeMLCommandAbs;
      const lineCommandCode = command === 'l' || command === 'm' ? 'l' : 'L';
      /** @type {PathCommand[]} */
      // @ts-ignore
      const commands = [commandFunc(command, args[0], args[1])];
      for (let index = 2; index < args.length; index += 2) {
        commands.push(
          // @ts-ignore
          commandFunc(lineCommandCode, args[index], args[index + 1]),
        );
      }
      return commands;
    }
    case 'S': {
      if (args.length === 0 || args.length % 4 !== 0) {
        throw new PathParseError(
          `number of arguments found for path command "${command} must be a multiple of 4"`,
        );
      }
      const commands = [];
      for (let index = 0; index < args.length; index += 4) {
        commands.push({
          command: command,
          cp2x: new ExactNum(args[index + 0]),
          cp2y: new ExactNum(args[index + 1]),
          x: new ExactNum(args[index + 2]),
          y: new ExactNum(args[index + 3]),
        });
      }
      return commands;
    }
    default:
      throw new PathParseError(`unexpected command "${command}"`);
  }
}

/**
 * @param {'L'|'M'} command
 * @param {string} arg1
 * @param {string} arg2
 * @returns {LineAbs|MoveAbs}
 */
function makeMLCommandAbs(command, arg1, arg2) {
  return {
    command: command,
    x: new ExactNum(arg1),
    y: new ExactNum(arg2),
  };
}

/**
 * @param {'l'|'m'} command
 * @param {string} arg1
 * @param {string} arg2
 * @returns {LineRel|MoveRel}
 */
function makeMLCommandRel(command, arg1, arg2) {
  return {
    command: command,
    dx: new ExactNum(arg1),
    dy: new ExactNum(arg2),
  };
}

/**
 * @param {PathCommand[]} commands
 * @returns {PathCommand[]}
 */
function normalize(commands) {
  return commands;
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
        continue;
      case 'digit':
        currentArg += c;
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
  /**
   * @param {string} commandCode
   * @param  {ExactNum[]} args
   */
  function stringifyBezier(commandCode, ...args) {
    let result = '';
    // If last command was the same, no need to repeat it.
    if (prevCommand !== commandCode) {
      result += commandCode;
    }
    for (let index = 0; index < args.length; index++) {
      const arg = args[index].getMinifiedString();
      if (index === 0) {
        // Don't print space unless we're omitting the command, and we need a space before the first arg.
        if (prevCommand === commandCode && needSpaceBefore(arg)) {
          result += ' ';
        }
      } else if (needSpaceBefore(arg)) {
        result += ' ';
      }
      result += arg;
      lastNumber = arg;
    }

    prevCommand = commandCode;
    return result;
  }

  /**
   * @param {string} commandCode
   * @param {ExactNum} arg1
   * @param {ExactNum} arg2
   */
  function stringifyML(commandCode, arg1, arg2) {
    let result = '';
    const v1 = arg1.getMinifiedString();
    const v2 = arg2.getMinifiedString();

    if (
      ((prevCommand === 'm' || prevCommand === 'l') && commandCode === 'l') ||
      ((prevCommand === 'M' || prevCommand === 'L') && commandCode === 'L')
    ) {
      // See if we can shorten the command by omitting the 'l' or 'L'.
      if (!needSpaceBefore(v1)) {
        commandCode = '';
      }
    }
    if (commandCode !== '') {
      result += commandCode;
      prevCommand = commandCode;
    }
    result += v1;
    const v2Start = getCharType(v2[0]);
    if (v2Start === 'digit' || (v2Start === '.' && !v1.includes('.'))) {
      result += ' ';
    }
    result += v2;
    lastNumber = v2;
    return result;
  }

  let result = '';
  let prevCommand = '';
  let lastNumber = '';
  for (const command of commands) {
    switch (command.command) {
      case 'h':
        result += command.command;
        result += command.dx.getMinifiedString();
        prevCommand = command.command;
        break;
      case 'l':
      case 'm':
        result += stringifyML(command.command, command.dx, command.dy);
        break;
      case 'L':
      case 'M':
        result += stringifyML(command.command, command.x, command.y);
        break;
      case 'C':
        result += stringifyBezier(
          command.command,
          command.cp1x,
          command.cp1y,
          command.cp2x,
          command.cp2y,
          command.x,
          command.y,
        );
        break;
      case 'S':
        result += stringifyBezier(
          command.command,
          command.cp2x,
          command.cp2y,
          command.x,
          command.y,
        );
        break;
      default:
        // @ts-ignore
        throw new Error(`unexpected command "${command.command}"`);
    }
  }
  return result;
}

class ExactNum {
  #str;
  /** @type {number|undefined} */
  #value;
  /** @type {number|undefined} */
  #numDigits;

  /**
   * @param {string} str
   */
  constructor(str) {
    this.#str = str;
  }

  getMinifiedString() {
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

  getNumberOfDigits() {
    if (this.#numDigits === undefined) {
      this.#numDigits = getNumberOfDecimalDigits(this.#str);
    }
    return this.#numDigits;
  }

  getValue() {
    if (this.#value === undefined) {
      this.#value = parseFloat(this.#str);
    }
    return this.#value;
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
