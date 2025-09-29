import FS from 'fs';
import PATH from 'path';
import { EOL } from 'os';
import { fileURLToPath } from 'url';
import { optimize } from '../../lib/svgo.js';
import { getResolvedPlugins, validateParentNodes } from '../utils.js';
import { builtinPlugins } from '../../plugins/builtin.js';
import * as cleanupTextNodes from '../../plugins/cleanupTextNodes.js';

const regEOL = new RegExp(EOL, 'g');
const regFilename = /^(.*)\.(\d+)\.svg\.txt$/;
const __dirname = PATH.dirname(fileURLToPath(import.meta.url));

describe('plugins tests', function () {
  FS.readdirSync(__dirname).forEach(function (file) {
    let match = file.match(regFilename),
      index;
    /** @type {string} */
    let name;

    if (match) {
      name = match[1];
      index = match[2];

      file = PATH.resolve(__dirname, file);

      it(name + '.' + index, async function () {
        return readFile(file).then(function (data) {
          // remove description
          const items = normalize(data).split(/\s*===\s*/);
          const test = items.length === 2 ? items[1] : items[0];
          // extract test case
          const [original, should, params] = test.split(/\s*@@@\s*/);

          const fn = builtinPlugins.get(name)?.fn;
          if (!fn) {
            throw new Error();
          }
          /** @type {import('../../lib/svgo.js').CustomPlugin} */
          const plugin = {
            name: name,
            fn: fn,
            params: params ? JSON.parse(params) : {},
          };
          let lastResultData = original;
          // test plugins idempotence
          const passes = 2;
          for (let i = 0; i < passes; i += 1) {
            const result = optimize(lastResultData, {
              path: file,
              plugins: getResolvedPlugins([cleanupTextNodes, plugin]),
              js2svg: { pretty: true, indent: getIndent(should) },
              maxPasses: 1,
            });
            lastResultData = result.data;
            expect(normalize(result.data)).toStrictEqual(should);

            // If exception was thrown before optimization completed, there will be no AST.
            if (result.ast) {
              expect(validateParentNodes(result.ast)).toBe(true);
            }
          }
        });
      });
    }
  });
});

/**
 * @param {string} str
 * @returns {number}
 */
function getIndent(str) {
  let line2Pos = str.indexOf('\n');
  let indent = 0;
  while (str[++line2Pos] === ' ') {
    indent++;
  }
  return indent === 2 ? 2 : 4;
}

/**
 * @param {string} file
 */
function normalize(file) {
  return file.trim().replace(regEOL, '\n');
}

/**
 * @param {string} file
 */
function readFile(file) {
  return new Promise(function (resolve, reject) {
    FS.readFile(file, 'utf8', function (err, data) {
      if (err) return reject(err);
      resolve(data);
    });
  });
}
