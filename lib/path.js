import { isDigit, minifyNumber, toFixed } from './svgo/tools.js';

/**
 * @typedef {import('./types.js').PathDataItem} PathDataItem
 * @typedef {import('./types.js').PathDataCommand} PathDataCommand
 * @typedef {'none' | 'sign' | 'whole' | 'decimal_point' | 'decimal' | 'e' | 'exponent_sign' | 'exponent'} ReadNumberState
 */

/**
 * @type {(number: number, precision?: number) => {
 *   roundedStr: string,
 *   rounded: number
 * }}
 */
const roundAndStringify = (number, precision) => {
  if (precision != null) {
    number = toFixed(number, precision);
  }

  return {
    roundedStr: minifyNumber(number),
    rounded: number,
  };
};

/**
 * Elliptical arc large-arc and sweep flags are rendered with spaces
 * because many non-browser environments are not able to parse such paths
 *
 * @type {(
 *   command: string,
 *   args: number[],
 *   precision?: number,
 *   disableSpaceAfterFlags?: boolean
 * ) => string}
 */
const stringifyArgs = (command, args, precision, disableSpaceAfterFlags) => {
  let result = '';
  let previous;

  for (let i = 0; i < args.length; i++) {
    const { roundedStr, rounded } = roundAndStringify(args[i], precision);
    if (
      disableSpaceAfterFlags &&
      (command === 'A' || command === 'a') &&
      // consider combined arcs
      (i % 7 === 4 || i % 7 === 5)
    ) {
      result += roundedStr;
    } else if (i === 0 || rounded < 0) {
      // avoid space before first and negative numbers
      result += roundedStr;
    } else if (!Number.isInteger(previous) && !isDigit(roundedStr[0])) {
      // remove space before decimal with zero whole
      // only when previous number is also decimal
      result += roundedStr;
    } else {
      result += ` ${roundedStr}`;
    }
    previous = rounded;
  }

  return result;
};

/**
 * @typedef {{
 *   pathData: PathDataItem[];
 *   precision?: number;
 *   disableSpaceAfterFlags?: boolean;
 * }} StringifyPathDataOptions
 */

/**
 * @param {StringifyPathDataOptions} options
 * @returns {string}
 * @deprecated
 */
export const stringifyPathData = ({
  pathData,
  precision,
  disableSpaceAfterFlags,
}) => {
  if (pathData.length === 0) {
    return '';
  }
  if (pathData.length === 1) {
    const { command, args } = pathData[0];
    return (
      command + stringifyArgs(command, args, precision, disableSpaceAfterFlags)
    );
  }

  let result = '';
  let prev = { ...pathData[0] };

  // match leading moveto with following lineto
  if (pathData[1].command === 'L') {
    prev.command = 'M';
  } else if (pathData[1].command === 'l') {
    prev.command = 'm';
  }

  for (let i = 1; i < pathData.length; i++) {
    const { command, args } = pathData[i];
    if (
      (prev.command === command &&
        prev.command !== 'M' &&
        prev.command !== 'm') ||
      // combine matching moveto and lineto sequences
      (prev.command === 'M' && command === 'L') ||
      (prev.command === 'm' && command === 'l')
    ) {
      prev.args = [...prev.args, ...args];
      if (i === pathData.length - 1) {
        result +=
          prev.command +
          stringifyArgs(
            prev.command,
            prev.args,
            precision,
            disableSpaceAfterFlags,
          );
      }
    } else {
      result +=
        prev.command +
        stringifyArgs(
          prev.command,
          prev.args,
          precision,
          disableSpaceAfterFlags,
        );

      if (i === pathData.length - 1) {
        result +=
          command +
          stringifyArgs(command, args, precision, disableSpaceAfterFlags);
      } else {
        prev = { command, args };
      }
    }
  }

  return result;
};
