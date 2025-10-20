import fs from 'node:fs';
import * as path from 'node:path';
import { parseSvg } from '../../lib/parser.js';
import { getDocData } from '../../lib/docdata.js';
import { visit } from '../../lib/xast.js';

/**
 * @param {string} fileName
 */
export function generateData(fileName) {
  if (!fileName.includes('/'))
    fileName = path.join('./test/lib/docdata', fileName);
  const input = fs.readFileSync(fileName, 'utf8');
  const root = parseSvg(input);
  return { root: root, docData: getDocData(root) };
}

/**
 * @param {import('../../lib/types.js').XastRoot} root
 * @returns {Map<string,import('../../lib/types.js').XastElement>}
 */
export function generateTreeData(root) {
  const data = new Map();
  visit(root, {
    element: {
      enter: (element) => {
        const id = element.svgAtts.get('id')?.toString();
        if (id) {
          data.set(id, element);
        }
      },
    },
  });

  return data;
}
