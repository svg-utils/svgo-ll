import fs from 'node:fs';
import { parseSvg } from '../../lib/parser.js';
import { getDocData } from '../../lib/docdata.js';
import { visit } from '../../lib/xast.js';

/**
 * @param {{elName:string,atts:[string,string][]}} elData
 * @returns {import('../../lib/types.js').XastElement}
 */
export function createElement(elData) {
  /** @type {import('../../lib/types.js').XastRoot} */
  const root = { type: 'root', children: [] };
  /** @type {import('../../lib/types.js').XastElement} */
  const element = {
    type: 'element',
    name: elData.elName,
    parentNode: root,
    attributes: {},
    children: [],
  };
  for (const att of elData.atts) {
    element.attributes[att[0]] = att[1];
  }
  root.children.push(element);
  return element;
}

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
