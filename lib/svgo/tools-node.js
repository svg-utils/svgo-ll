import { readFileSync } from 'fs';
import { SVGOError } from './tools.js';

/**
 * @param {string} fileName
 * @returns {{}}
 */
export function readJSONFile(fileName) {
  let str;
  try {
    str = readFileSync(fileName, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new SVGOError(error.message);
    }
    throw error;
  }
  try {
    return JSON.parse(str);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SVGOError(
        `${error.message.replaceAll('\n', '')} reading file ${fileName}`,
      );
    }
    throw error;
  }
}
