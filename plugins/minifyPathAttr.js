import { pathElems } from './_collections.js';

/**
 * @typedef {{'command':'h',dx:ExactNum}} HRel
 * @typedef {{'command':'l',dx:ExactNum,dy:ExactNum}} LineRel
 * @typedef {{'command':'m',dx:ExactNum,dy:ExactNum}} MoveRel
 * @typedef {HRel|LineRel|MoveRel} PathCommand
 * @typedef {'none' | 'sign' | 'whole' | 'decimal_point' | 'decimal' | 'e' | 'exponent_sign' | 'exponent'} ReadNumberState
 */

export const name = 'minifyPathAttr';
export const description = 'writes path commands in shortest form';

/** @type {Object<string,number>} */
const argsCountPerCommand = {
  M: 2,
  m: 2,
  Z: 0,
  z: 0,
  L: 2,
  l: 2,
  H: 1,
  h: 1,
  V: 1,
  v: 1,
  C: 6,
  c: 6,
  S: 4,
  s: 4,
  Q: 4,
  q: 4,
  T: 2,
  t: 2,
  A: 7,
  a: 7,
};

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
          const origData = parsePathCommands(node.attributes.d);
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
    case 'h':
    case 'H':
    case 'l':
    case 'L':
    case 'm':
    case 'M':
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
      throw new PathParseError(`unexpected character "${c}" in path`);
  }
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

  /**
   * @param {string} command
   * @param {string[]} args
   * @returns {PathCommand[]}
   */
  function makeCommand(command, args) {
    switch (command) {
      case 'h':
        return [
          {
            command: command,
            dx: new ExactNum(args[0]),
          },
        ];
      case 'm': {
        if (args.length % 2 !== 0) {
          throw new PathParseError('odd number of arguments found for move');
        }
        /** @type {PathCommand[]} */
        const commands = [
          {
            command: command,
            dx: new ExactNum(args[0]),
            dy: new ExactNum(args[1]),
          },
        ];
        for (let index = 2; index < args.length; index += 2) {
          commands.push({
            command: 'l',
            dx: new ExactNum(args[index]),
            dy: new ExactNum(args[index + 1]),
          });
        }
        return commands;
      }
      default:
        throw new Error(`unexpected command "${command}"`);
    }
  }

  /*** @type {PathCommand[]} */
  const commands = [];
  /** @type {'start'|'command'} */
  let state = 'start';
  /** @type {string} */
  let currentCommand = '';
  /** @type {string[]} */
  let args = [];
  /** @type {string} */
  let currentArg = '';
  // true if we have already seen a decimal point in the current arg.
  let hasDecimal = false;
  // true if we are in the exponent portion of a number.
  let inExponent = false;

  for (let index = 0; index < path.length; index++) {
    const c = path[index];
    switch (state) {
      case 'command':
        switch (getCharType(c)) {
          case 'command':
            addCurrentCommand(c);
            continue;
          case '.':
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
            if (
              currentArg.length &&
              currentArg[currentArg.length - 1] !== 'e'
            ) {
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
            if (currentArg === '') {
              throw new PathParseError(
                args.length === 0
                  ? 'comma not allowed before first argument'
                  : 'only one comma allowed between arguments',
              );
            }
            addArg();
            continue;
          default:
            throw new PathParseError(
              `unexpected character "${c}" in "command" state`,
            );
        }
      case 'start':
        switch (getCharType(c)) {
          case 'space':
            continue;
          case 'command':
            currentCommand = c;
            state = 'command';
            break;
          default:
            throw new PathParseError(
              `unexpected character "${c}" in "start" state`,
            );
        }
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
   * @param {string} commandCode
   * @param {ExactNum} arg1
   * @param {ExactNum} arg2
   */
  function stringify2Args(commandCode, arg1, arg2) {
    let result = '';
    const v1 = arg1.getString();
    const v2 = arg2.getString();

    if (prevCommand === 'm' && commandCode === 'l') {
      // See if we can shorten the command by omitting the 'l'.
      if (v1.startsWith('-')) {
        commandCode = '';
      }
    }
    if (commandCode !== '') {
      result += commandCode;
      prevCommand = commandCode;
    }
    result += v1;
    if (getCharType(v2[0]) === 'digit' || !v1.includes('.')) {
      result += ' ';
    }
    result += v2;
    return result;
  }

  let result = '';
  let prevCommand = '';
  for (const command of commands) {
    switch (command.command) {
      case 'h':
        result += command.command;
        result += command.dx.getString();
        prevCommand = command.command;
        break;
      case 'l':
      case 'm':
        result += stringify2Args(command.command, command.dx, command.dy);
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

  /**
   * @param {string} str
   */
  constructor(str) {
    this.#str = str;
  }

  getString() {
    return this.#str;
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
