import { pathElems } from './_collections.js';

/**
 * @typedef {{'command':'h',dx:ExactNum}} HRel
 * @typedef {{'command':'m',dx:ExactNum,dy:ExactNum}} MoveRel
 * @typedef {HRel|MoveRel} PathCommand
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
 * @returns {'space'|'command'|'digit'}
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
  /**
   * @param {string} nextCommand
   */
  function addCurrentCommand(nextCommand) {
    if (currentArg !== '') {
      args.push(currentArg);
    }
    commands.push(makeCommand(currentCommand, args));
    currentCommand = nextCommand;
    args = [];
    currentArg = '';
  }

  /**
   * @param {string} command
   * @param {string[]} args
   * @returns {PathCommand}
   */
  function makeCommand(command, args) {
    switch (command) {
      case 'h':
        return {
          command: command,
          dx: new ExactNum(args[0]),
        };
      case 'm':
        return {
          command: command,
          dx: new ExactNum(args[0]),
          dy: new ExactNum(args[1]),
        };
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

  for (let index = 0; index < path.length; index++) {
    const c = path[index];
    switch (state) {
      case 'command':
        switch (getCharType(c)) {
          case 'command':
            addCurrentCommand(c);
            continue;
          case 'digit':
            currentArg += c;
            continue;
          case 'space':
            if (currentArg) {
              args.push(currentArg);
              currentArg = '';
            }
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
            args = [];
            currentArg = '';
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
  let result = '';
  for (const command of commands) {
    switch (command.command) {
      case 'h':
        {
          const arg1 = command.dx.getString();
          result += command.command;
          result += arg1;
        }
        break;
      case 'm':
        {
          const arg1 = command.dx.getString();
          const arg2 = command.dy.getString();
          result += command.command;
          result += arg1;
          result += ' ' + arg2;
        }
        break;
      default:
        throw new Error(`unexpected command "${command}"`);
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
