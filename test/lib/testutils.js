import fs from 'node:fs';
import { parseSvg } from '../../lib/parser.js';
import { getDocData } from '../../lib/docdata.js';

/**
 * @param {string} fileName
 */
export function generateData(fileName) {
  const input = fs.readFileSync(fileName, 'utf8');
  const root = parseSvg(input);
  return { root: root, docData: getDocData(root) };
}
