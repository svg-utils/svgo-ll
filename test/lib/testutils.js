import fs from 'node:fs';
import { parseSvg } from '../../lib/parser.js';
import { getDocData } from '../../lib/docdata.js';
import { visit } from '../../lib/xast.js';

/**
 * @param {string} fileName
 */
export function generateData(fileName) {
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
      enter: (node) => {
        if (node.attributes.id) {
          data.set(node.attributes.id, node);
        }
      },
    },
  });

  return data;
}
